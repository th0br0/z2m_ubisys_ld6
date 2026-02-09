/**
 * Zigbee2MQTT External Converter for ubisys J1/J1-R Shutter Control
 * 
 * This converter provides comprehensive support for the ubisys J1/J1-R
 * ZigBee shutter control with integrated smart meter.
 * 
 * Features:
 * - Window covering control (position, tilt, open/close/stop)
 * - Metering (power, energy)
 * - Electrical measurements (voltage, current, frequency)
 * - Advanced configuration (calibration, motor settings)
 * - Input configuration for switch types
 * - Manufacturer-specific calibration attributes
 * 
 * Based on the ubisys J1 Technical Reference Manual.
 */

import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import { Zcl } from 'zigbee-herdsman';
import { Buffer } from 'buffer';

const e = exposes.presets || (exposes.default && exposes.default.presets) || exposes;
const ea = exposes.access || (exposes.default && exposes.default.access);

const UBISYS_MANUFACTURER_CODE = Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH;

// Window covering types from the technical reference
const WINDOW_COVERING_TYPES = {
    0: 'Roller Shade',
    1: 'Roller Shade (2 motors)',
    2: 'Roller Shade (exterior)',
    3: 'Roller Shade (2 motors, exterior)',
    4: 'Drapery',
    5: 'Awning',
    6: 'Shutter',
    7: 'Tilt Blind (tilt only)',
    8: 'Tilt Blind (lift & tilt)',
    9: 'Projector Screen',
};

// Configuration status flags
const CONFIG_STATUS_FLAGS = {
    OPERATIONAL: 0x01,
    ONLINE: 0x02,
    OPEN_LIMIT: 0x04,
    CLOSE_LIMIT: 0x08,
    LIFT_POSITION_AWARE: 0x10,
    TILT_POSITION_AWARE: 0x20,
    CLOSED_LOOP_LIFT: 0x08,
    CLOSED_LOOP_TILT: 0x10,
};

/**
 * Safely retrieves the ubisys device setup endpoint (232).
 */
function getSetupEndpoint(device) {
    const ep = device.getEndpoint(232);
    if (!ep) throw new Error('ubisys setup endpoint (232) not found');
    return ep;
}

/**
 * Writes a structured attribute to the manufacturer-specific setup cluster.
 */
async function writeSetupAttribute(device, attrId, elements, dataType = Zcl.DataType.ARRAY) {
    const endpoint = getSetupEndpoint(device);
    await endpoint.writeStructured('manuSpecificUbisysDeviceSetup', [{
        attrId, selector: {}, dataType,
        elementData: { elementType: Zcl.DataType.OCTET_STR, elements }
    }]);
}

// fromZigbee converter for input configurations
const fzInputConfigurations = {
    cluster: 'manuSpecificUbisysDeviceSetup',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.inputConfigurations !== undefined) {
            result.input_configurations = msg.data.inputConfigurations.map(b => b[0]);
        }
        if (msg.data.inputActions !== undefined) {
            result.input_actions = msg.data.inputActions.map(b => b.toString('hex'));
        }
        return result;
    },
};

// fromZigbee converter for window covering cluster
const fzWindowCovering = {
    cluster: 'closuresWindowCovering',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        // Standard attributes
        if (msg.data.currentPositionLiftPercentage !== undefined) {
            result.position = 100 - msg.data.currentPositionLiftPercentage;
        }
        if (msg.data.currentPositionTiltPercentage !== undefined) {
            result.tilt = 100 - msg.data.currentPositionTiltPercentage;
        }
        if (msg.data.windowCoveringType !== undefined) {
            result.window_covering_type = WINDOW_COVERING_TYPES[msg.data.windowCoveringType] || `Unknown (${msg.data.windowCoveringType})`;
            result.window_covering_type_raw = msg.data.windowCoveringType;
        }
        if (msg.data.configStatus !== undefined) {
            result.config_status = msg.data.configStatus;
            result.config_status_lift_closed_loop = !!(msg.data.configStatus & CONFIG_STATUS_FLAGS.CLOSED_LOOP_LIFT);
            result.config_status_tilt_closed_loop = !!(msg.data.configStatus & CONFIG_STATUS_FLAGS.CLOSED_LOOP_TILT);
        }
        if (msg.data.operationalStatus !== undefined) {
            const status = msg.data.operationalStatus;
            result.operational_status = status;
            result.moving = status !== 0;
            if ((status & 0x03) === 0x01) result.movement = 'opening';
            else if ((status & 0x03) === 0x02) result.movement = 'closing';
            else result.movement = 'stopped';
        }
        if (msg.data.mode !== undefined) {
            result.mode = msg.data.mode;
            result.calibration_mode = !!(msg.data.mode & 0x02);
            result.motor_reversed = !!(msg.data.mode & 0x01);
        }

        // Position limits
        if (msg.data.installedOpenLimitLift !== undefined) {
            result.installed_open_limit_lift_cm = msg.data.installedOpenLimitLift;
        }
        if (msg.data.installedClosedLimitLift !== undefined) {
            result.installed_closed_limit_lift_cm = msg.data.installedClosedLimitLift;
        }
        if (msg.data.installedOpenLimitTilt !== undefined) {
            result.installed_open_limit_tilt_ddeg = msg.data.installedOpenLimitTilt;
        }
        if (msg.data.installedClosedLimitTilt !== undefined) {
            result.installed_closed_limit_tilt_ddeg = msg.data.installedClosedLimitTilt;
        }

        return result;
    },
};

// fromZigbee converter for window covering manufacturer-specific attributes
const fzWindowCoveringMfr = {
    cluster: 'closuresWindowCovering',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        // Manufacturer-specific calibration attributes
        if (msg.data[0x1000] !== undefined) {
            result.turnaround_guard_time = msg.data[0x1000] * 50; // Convert to ms
        }
        if (msg.data[0x1001] !== undefined) {
            result.lift_to_tilt_transition_steps = msg.data[0x1001];
        }
        if (msg.data[0x1002] !== undefined) {
            result.total_steps = msg.data[0x1002];
        }
        if (msg.data[0x1003] !== undefined) {
            result.lift_to_tilt_transition_steps_2 = msg.data[0x1003];
        }
        if (msg.data[0x1004] !== undefined) {
            result.total_steps_2 = msg.data[0x1004];
        }
        if (msg.data[0x1005] !== undefined) {
            result.additional_steps = msg.data[0x1005];
        }
        if (msg.data[0x1006] !== undefined) {
            result.inactive_power_threshold = msg.data[0x1006];
        }
        if (msg.data[0x1007] !== undefined) {
            result.startup_steps = msg.data[0x1007];
        }

        return result;
    },
};

// fromZigbee converter for metering cluster
const fzMetering = {
    cluster: 'seMetering',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        if (msg.data.currentSummDelivered !== undefined) {
            // Convert to kWh (assuming multiplier/divisor of 1/1000)
            const value = msg.data.currentSummDelivered[1] + (msg.data.currentSummDelivered[0] << 32);
            result.energy = value / 1000;
        }
        if (msg.data.instantaneousDemand !== undefined) {
            result.power = msg.data.instantaneousDemand;
        }

        return result;
    },
};

// fromZigbee converter for electrical measurement cluster
const fzElectricalMeasurement = {
    cluster: 'haElectricalMeasurement',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        if (msg.data.acFrequency !== undefined) {
            result.ac_frequency = msg.data.acFrequency / 1000; // Convert to Hz
        }
        if (msg.data.rmsVoltage !== undefined) {
            result.voltage = msg.data.rmsVoltage;
        }
        if (msg.data.rmsCurrent !== undefined) {
            result.current = msg.data.rmsCurrent / 1000; // Convert to A
        }
        if (msg.data.activePower !== undefined) {
            result.active_power = msg.data.activePower;
        }
        if (msg.data.reactivePower !== undefined) {
            result.reactive_power = msg.data.reactivePower;
        }
        if (msg.data.apparentPower !== undefined) {
            result.apparent_power = msg.data.apparentPower;
        }
        if (msg.data.powerFactor !== undefined) {
            result.power_factor = msg.data.powerFactor / 100;
        }

        return result;
    },
};

// toZigbee converter for window covering commands
const tzWindowCovering = {
    key: ['state', 'position', 'tilt'],
    convertSet: async (entity, key, value, meta) => {
        if (key === 'state') {
            const lookup = { 'open': 'upOpen', 'close': 'downClose', 'stop': 'stop' };
            const command = lookup[value.toLowerCase()];
            if (command) {
                await entity.command('closuresWindowCovering', command, {});
            }
        } else if (key === 'position') {
            const position = Math.max(0, Math.min(100, value));
            await entity.command('closuresWindowCovering', 'goToLiftPercentage', { percentageliftvalue: 100 - position });
        } else if (key === 'tilt') {
            const tilt = Math.max(0, Math.min(100, value));
            await entity.command('closuresWindowCovering', 'goToTiltPercentage', { percentagetiltvalue: 100 - tilt });
        }
        return { state: { [key]: value } };
    },
    convertGet: async (entity, key, meta) => {
        if (key === 'position') {
            await entity.read('closuresWindowCovering', ['currentPositionLiftPercentage']);
        } else if (key === 'tilt') {
            await entity.read('closuresWindowCovering', ['currentPositionTiltPercentage']);
        }
    },
};

// toZigbee converter for J1 configuration
const tzConfigureJ1 = {
    key: ['configure_j1'],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(1);
        const log = meta.logger || console;

        // Helper function to convert time-based values to steps
        const stepsPerSecond = value.steps_per_second || 50;

        // Handle calibration mode
        if (value.calibrate) {
            log.info('ubisys J1: Starting calibration...');

            // Set calibration preparation values
            await endpoint.write('closuresWindowCovering',
                { installedOpenLimitLift: 0x0000 },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { installedClosedLimitLift: 0x00F0 },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { installedOpenLimitTilt: 0x0000 },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { installedClosedLimitTilt: 0x0384 },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });

            // Invalidate step values
            await endpoint.write('closuresWindowCovering',
                { 0x1001: { value: 0xFFFF, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { 0x1002: { value: 0xFFFF, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { 0x1003: { value: 0xFFFF, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            await endpoint.write('closuresWindowCovering',
                { 0x1004: { value: 0xFFFF, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });

            // Enter calibration mode
            await endpoint.write('closuresWindowCovering', { mode: 0x02 });
            log.info('ubisys J1: Calibration mode entered. Move blind down, then up, then down, then up to complete.');
        }

        // Set window covering type
        if (value.windowCoveringType !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { windowCoveringType: value.windowCoveringType },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
            log.info(`ubisys J1: Window covering type set to ${WINDOW_COVERING_TYPES[value.windowCoveringType] || value.windowCoveringType}`);
        }

        // Set config status
        if (value.configStatus !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { configStatus: value.configStatus },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set lift limits
        if (value.installedOpenLimitLiftCm !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { installedOpenLimitLift: value.installedOpenLimitLiftCm },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }
        if (value.installedClosedLimitLiftCm !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { installedClosedLimitLift: value.installedClosedLimitLiftCm },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set tilt limits
        if (value.installedOpenLimitTiltDdegree !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { installedOpenLimitTilt: value.installedOpenLimitTiltDdegree },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }
        if (value.installedClosedLimitTiltDdegree !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { installedClosedLimitTilt: value.installedClosedLimitTiltDdegree },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set turnaround guard time
        if (value.turnaroundGuardTime !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1000: { value: value.turnaroundGuardTime, type: Zcl.DataType.UINT8 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set step values (either directly or converted from time)
        let liftToTiltSteps = value.liftToTiltTransitionSteps;
        let liftToTiltSteps2 = value.liftToTiltTransitionSteps2;
        let totalSteps = value.totalSteps;
        let totalSteps2 = value.totalSteps2;

        // Convert from time if specified
        if (value.lift_to_tilt_transition_ms !== undefined) {
            liftToTiltSteps = Math.round(value.lift_to_tilt_transition_ms / 1000 * stepsPerSecond);
            liftToTiltSteps2 = liftToTiltSteps; // Should be equal per spec
        }
        if (value.open_to_closed_s !== undefined) {
            totalSteps = Math.round(value.open_to_closed_s * stepsPerSecond);
        }
        if (value.closed_to_open_s !== undefined) {
            totalSteps2 = Math.round(value.closed_to_open_s * stepsPerSecond);
        }

        if (liftToTiltSteps !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1001: { value: liftToTiltSteps, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }
        if (liftToTiltSteps2 !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1003: { value: liftToTiltSteps2, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }
        if (totalSteps !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1002: { value: totalSteps, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }
        if (totalSteps2 !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1004: { value: totalSteps2, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set additional steps percentage
        if (value.additionalSteps !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1005: { value: value.additionalSteps, type: Zcl.DataType.UINT8 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set inactive power threshold
        if (value.inactivePowerThreshold !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1006: { value: value.inactivePowerThreshold, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Set startup steps
        if (value.startupSteps !== undefined) {
            await endpoint.write('closuresWindowCovering',
                { 0x1007: { value: value.startupSteps, type: Zcl.DataType.UINT16 } },
                { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        }

        // Exit calibration mode when done
        if (value.calibrate === 0 || value.exitCalibration) {
            await endpoint.write('closuresWindowCovering', { mode: 0x00 });
            log.info('ubisys J1: Calibration mode exited.');
        }

        return { state: { configure_j1: 'configured' } };
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(1);

        // Read standard attributes
        await endpoint.read('closuresWindowCovering', [
            'windowCoveringType', 'configStatus', 'mode',
            'installedOpenLimitLift', 'installedClosedLimitLift',
            'installedOpenLimitTilt', 'installedClosedLimitTilt',
        ]);

        // Read manufacturer-specific attributes
        await endpoint.read('closuresWindowCovering', [0x1000, 0x1001, 0x1002, 0x1003, 0x1004, 0x1005, 0x1006, 0x1007],
            { manufacturerCode: UBISYS_MANUFACTURER_CODE });
    },
};

// toZigbee converter for input configuration
const tzInputConfigurations = {
    key: ['input_configurations'],
    convertSet: async (entity, key, value, meta) => {
        const data = value.map(val => Buffer.from([val]));
        await writeSetupAttribute(meta.device, 0x0000, data);
        return { state: { input_configurations: value } };
    },
    convertGet: async (entity, key, meta) => {
        await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputConfigurations']);
    },
};

// toZigbee converter for input actions
const tzInputActions = {
    key: ['input_actions'],
    convertSet: async (entity, key, value, meta) => {
        const data = value.map(val => Buffer.from(val, 'hex'));
        await writeSetupAttribute(meta.device, 0x0001, data);
        return { state: { input_actions: value } };
    },
    convertGet: async (entity, key, meta) => {
        await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputActions']);
    },
};

// toZigbee for mode (motor direction reversal)
const tzMode = {
    key: ['motor_reversed'],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(1);
        const currentMode = (await endpoint.read('closuresWindowCovering', ['mode'])).mode || 0;
        const newMode = value ? (currentMode | 0x01) : (currentMode & ~0x01);
        await endpoint.write('closuresWindowCovering', { mode: newMode });
        return { state: { motor_reversed: value } };
    },
    convertGet: async (entity, key, meta) => {
        await meta.device.getEndpoint(1).read('closuresWindowCovering', ['mode']);
    },
};

// toZigbee for power and energy reading
const tzMeteringGet = {
    key: ['power', 'energy'],
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(3);
        if (key === 'power') {
            await endpoint.read('seMetering', ['instantaneousDemand']);
        } else if (key === 'energy') {
            await endpoint.read('seMetering', ['currentSummDelivered']);
        }
    },
};

// toZigbee for electrical measurements
const tzElectricalGet = {
    key: ['voltage', 'current', 'ac_frequency', 'active_power', 'reactive_power', 'apparent_power', 'power_factor'],
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(3);
        const attrMap = {
            voltage: 'rmsVoltage',
            current: 'rmsCurrent',
            ac_frequency: 'acFrequency',
            active_power: 'activePower',
            reactive_power: 'reactivePower',
            apparent_power: 'apparentPower',
            power_factor: 'powerFactor',
        };
        if (attrMap[key]) {
            await endpoint.read('haElectricalMeasurement', [attrMap[key]]);
        }
    },
};

const definition = {
    zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
    model: 'J1',
    vendor: 'ubisys',
    description: 'ZigBee shutter control with integrated smart meter for single-phase AC motors',
    fromZigbee: [
        fzWindowCovering,
        fzWindowCoveringMfr,
        fzMetering,
        fzElectricalMeasurement,
        fzInputConfigurations,
    ],
    toZigbee: [
        tzWindowCovering,
        tzConfigureJ1,
        tzInputConfigurations,
        tzInputActions,
        tzMode,
        tzMeteringGet,
        tzElectricalGet,
    ],
    extend: [
        m.deviceAddCustomCluster('manuSpecificUbisysDeviceSetup', {
            ID: 0xfc00,
            attributes: {
                inputConfigurations: { ID: 0x0000, type: Zcl.DataType.ARRAY, write: true },
                inputActions: { ID: 0x0001, type: Zcl.DataType.ARRAY, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
    ],
    exposes: [
        // Cover control
        e.cover_position_tilt(),

        // Metering
        e.power().withAccess(ea.STATE_GET),
        e.energy().withAccess(ea.STATE_GET),

        // Electrical measurements
        e.voltage().withAccess(ea.STATE_GET),
        e.current().withAccess(ea.STATE_GET),
        e.numeric('ac_frequency', ea.STATE_GET).withUnit('Hz').withDescription('AC line frequency'),
        e.numeric('active_power', ea.STATE_GET).withUnit('W').withDescription('Active power'),
        e.numeric('reactive_power', ea.STATE_GET).withUnit('VAr').withDescription('Reactive power'),
        e.numeric('apparent_power', ea.STATE_GET).withUnit('VA').withDescription('Apparent power'),
        e.numeric('power_factor', ea.STATE_GET).withDescription('Power factor'),

        // Device state
        e.binary('moving', ea.STATE, true, false).withDescription('Whether the motor is currently moving'),
        e.enum('movement', ea.STATE, ['stopped', 'opening', 'closing']).withDescription('Current movement direction'),

        // Configuration
        e.binary('motor_reversed', ea.ALL, true, false).withDescription('Reverse motor direction'),
        e.binary('calibration_mode', ea.STATE, true, false).withDescription('Device is in calibration mode'),
        e.enum('window_covering_type', ea.STATE, Object.values(WINDOW_COVERING_TYPES)).withDescription('Window covering type'),

        // Calibration values
        e.numeric('turnaround_guard_time', ea.STATE).withUnit('ms').withDescription('Guard time when reversing direction'),
        e.numeric('lift_to_tilt_transition_steps', ea.STATE).withDescription('Steps for lift-to-tilt transition (down)'),
        e.numeric('lift_to_tilt_transition_steps_2', ea.STATE).withDescription('Steps for tilt-to-lift transition (up)'),
        e.numeric('total_steps', ea.STATE).withDescription('Total steps from open to closed'),
        e.numeric('total_steps_2', ea.STATE).withDescription('Total steps from closed to open'),
        e.numeric('additional_steps', ea.STATE).withUnit('%').withDescription('Additional steps to ensure reaching limit'),
        e.numeric('inactive_power_threshold', ea.STATE).withUnit('mW').withDescription('Power threshold for detecting inactive motor'),
        e.numeric('startup_steps', ea.STATE).withDescription('Steps before checking power threshold after startup'),

        // Limits
        e.numeric('installed_open_limit_lift_cm', ea.STATE).withUnit('cm').withDescription('Open limit for lift'),
        e.numeric('installed_closed_limit_lift_cm', ea.STATE).withUnit('cm').withDescription('Closed limit for lift'),
        e.numeric('installed_open_limit_tilt_ddeg', ea.STATE).withUnit('0.1°').withDescription('Open limit for tilt'),
        e.numeric('installed_closed_limit_tilt_ddeg', ea.STATE).withUnit('0.1°').withDescription('Closed limit for tilt'),

        // Input configuration
        e.list('input_configurations', ea.ALL, e.numeric('value', ea.ALL)).withDescription('Input configuration flags (0x00=normal, 0x40=inverted, 0x80=disabled)'),
        e.list('input_actions', ea.ALL, e.text('value', ea.ALL)).withDescription('Input action micro-code (hex strings)'),

        // Configuration composite
        e.composite('configure_j1', 'configure_j1', ea.SET)
            .withDescription('Configure J1 device parameters')
            .withFeature(e.numeric('windowCoveringType', ea.SET).withValueMin(0).withValueMax(9).withDescription('Window covering type (0-9)'))
            .withFeature(e.numeric('configStatus', ea.SET).withDescription('Configuration status bitmap'))
            .withFeature(e.numeric('installedOpenLimitLiftCm', ea.SET).withDescription('Open lift limit in cm'))
            .withFeature(e.numeric('installedClosedLimitLiftCm', ea.SET).withDescription('Closed lift limit in cm'))
            .withFeature(e.numeric('installedOpenLimitTiltDdegree', ea.SET).withDescription('Open tilt limit in 0.1°'))
            .withFeature(e.numeric('installedClosedLimitTiltDdegree', ea.SET).withDescription('Closed tilt limit in 0.1°'))
            .withFeature(e.numeric('turnaroundGuardTime', ea.SET).withDescription('Turnaround guard time in 50ms units'))
            .withFeature(e.numeric('liftToTiltTransitionSteps', ea.SET).withDescription('Lift-to-tilt transition steps'))
            .withFeature(e.numeric('totalSteps', ea.SET).withDescription('Total steps (open to closed)'))
            .withFeature(e.numeric('liftToTiltTransitionSteps2', ea.SET).withDescription('Tilt-to-lift transition steps'))
            .withFeature(e.numeric('totalSteps2', ea.SET).withDescription('Total steps (closed to open)'))
            .withFeature(e.numeric('additionalSteps', ea.SET).withDescription('Additional steps percentage'))
            .withFeature(e.numeric('inactivePowerThreshold', ea.SET).withDescription('Inactive power threshold in mW'))
            .withFeature(e.numeric('startupSteps', ea.SET).withDescription('Startup steps'))
            .withFeature(e.binary('calibrate', ea.SET, 1, 0).withDescription('Enter calibration mode (1=start, 0=exit)'))
            .withFeature(e.numeric('open_to_closed_s', ea.SET).withDescription('Total time open to closed in seconds'))
            .withFeature(e.numeric('closed_to_open_s', ea.SET).withDescription('Total time closed to open in seconds'))
            .withFeature(e.numeric('lift_to_tilt_transition_ms', ea.SET).withDescription('Lift-to-tilt transition time in ms'))
            .withFeature(e.numeric('steps_per_second', ea.SET).withDescription('Steps per second (default 50)')),
    ],
    endpoint: (device) => {
        return {
            default: 1,
            l1: 1,          // Window covering device
            l2: 2,          // Window covering controller
            l3: 3,          // Metering
            setup: 232,     // Device management
        };
    },
    meta: {
        coverInvertPosition: false,
    },
    configure: async (device, coordinatorEndpoint, definition) => {
        // Endpoint 1: Window covering
        const endpoint1 = device.getEndpoint(1);
        if (endpoint1) {
            try {
                await endpoint1.read('closuresWindowCovering', [
                    'windowCoveringType', 'configStatus', 'mode',
                    'currentPositionLiftPercentage', 'currentPositionTiltPercentage',
                    'installedOpenLimitLift', 'installedClosedLimitLift',
                    'installedOpenLimitTilt', 'installedClosedLimitTilt',
                ]);

                // Read manufacturer-specific calibration attributes
                await endpoint1.read('closuresWindowCovering',
                    [0x1000, 0x1001, 0x1002, 0x1003, 0x1004, 0x1005, 0x1006, 0x1007],
                    { manufacturerCode: UBISYS_MANUFACTURER_CODE });

                // Configure reporting for position
                await endpoint1.configureReporting('closuresWindowCovering', [{
                    attribute: 'currentPositionLiftPercentage',
                    minimumReportInterval: 1,
                    maximumReportInterval: 300,
                    reportableChange: 1,
                }]);
                await endpoint1.configureReporting('closuresWindowCovering', [{
                    attribute: 'currentPositionTiltPercentage',
                    minimumReportInterval: 1,
                    maximumReportInterval: 300,
                    reportableChange: 1,
                }]);
            } catch (e) {
                console.warn(`ubisys J1: Failed to configure endpoint 1: ${e.message}`);
            }
        }

        // Endpoint 3: Metering
        const endpoint3 = device.getEndpoint(3);
        if (endpoint3) {
            try {
                await endpoint3.read('seMetering', ['currentSummDelivered', 'instantaneousDemand']);
                await endpoint3.read('haElectricalMeasurement', [
                    'rmsVoltage', 'rmsCurrent', 'acFrequency',
                    'activePower', 'reactivePower', 'apparentPower', 'powerFactor',
                ]);
            } catch (e) {
                console.warn(`ubisys J1: Failed to configure endpoint 3: ${e.message}`);
            }
        }

        // Endpoint 232: Device setup
        const setupEp = device.getEndpoint(232);
        if (setupEp) {
            try {
                await setupEp.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations', 'inputActions']);
            } catch (e) {
                console.warn(`ubisys J1: Failed to read device setup: ${e.message}`);
            }
        }
    },
    ota: true,
};

export default definition;
