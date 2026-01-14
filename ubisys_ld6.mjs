/**
 * Zigbee2MQTT External Converter for ubisys LD6 LED Controller
 * 
 * This converter provides support for the ubisys LD6 6-channel LED controller.
 * It uses a hybrid approach: ModernExtend for core logic, and dynamic exposes 
 * to correctly reflect the device's current configuration.
 */

import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import { Zcl } from 'zigbee-herdsman';

const e = exposes.presets;
const ea = exposes.access;

const UBISYS_MANUFACTURER_CODE = Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH;

// Output configurations from the technical reference
const OUTPUT_CONFIGURATIONS = {
    '1x_dimmable': { description: '1x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_cct': { description: '1x CCT / Tunable White', data: [[0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_rgb': { description: '1x RGB Color', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_rgbw': { description: '1x RGBW', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x11, 0xfe, 0x64, 0x61, 0x72, 0x60], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_rgbww': { description: '1x RGBWW', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '2x_dimmable': { description: '2x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x50, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '2x_cct': { description: '2x CCT / Tunable White', data: [[0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_rgb_1x_cct': { description: '1x RGB + 1x CCT', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '1x_cct_1x_rgb': { description: '1x CCT + 1x RGB', data: [[0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69], [0x53, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x54, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x55, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '2x_rgb': { description: '2x RGB Color', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x53, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x54, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x55, 0x42, 0xc6, 0x1f, 0xcc, 0x0e]] },
    '1x_rgbw_1x_cct': { description: '1x RGBW + 1x CCT', data: [[0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e], [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3], [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e], [0x11, 0xfe, 0x64, 0x61, 0x72, 0x60], [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52], [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69]] },
    '3x_dimmable': { description: '3x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x50, 0xff, 0xff, 0xff, 0xff, 0xff], [0x60, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '4x_dimmable': { description: '4x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x50, 0xff, 0xff, 0xff, 0xff, 0xff], [0x60, 0xff, 0xff, 0xff, 0xff, 0xff], [0x70, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '5x_dimmable': { description: '5x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x50, 0xff, 0xff, 0xff, 0xff, 0xff], [0x60, 0xff, 0xff, 0xff, 0xff, 0xff], [0x70, 0xff, 0xff, 0xff, 0xff, 0xff], [0x80, 0xff, 0xff, 0xff, 0xff, 0xff], [0x00, 0xff, 0xff, 0xff, 0xff, 0xff]] },
    '6x_dimmable': { description: '6x Dimmable (mono)', data: [[0x10, 0xff, 0xff, 0xff, 0xff, 0xff], [0x50, 0xff, 0xff, 0xff, 0xff, 0xff], [0x60, 0xff, 0xff, 0xff, 0xff, 0xff], [0x70, 0xff, 0xff, 0xff, 0xff, 0xff], [0x80, 0xff, 0xff, 0xff, 0xff, 0xff], [0x90, 0xff, 0xff, 0xff, 0xff, 0xff]] },
};

const fzOutputConfiguration = {
    cluster: 'manuSpecificUbisysDeviceSetup',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.outputConfigurations) {
            const elements = msg.data.outputConfigurations.map(buf => [buf.length, ...buf]);
            const raw = Buffer.from([0x48, 0x41, 0x06, 0x00, ...elements.flat()]).toString('hex');
            return { output_configuration_raw: raw };
        }
    },
};

// toZigbee converter for the 'output_mode' enum
const tzOutputConfiguration = {
    key: ['output_mode'],
    convertSet: async (entity, key, value, meta) => {
        const config = OUTPUT_CONFIGURATIONS[value];
        if (!config) throw new Error(`Unknown mode: ${value}`);

        // Write all 6 output slots to the device at once
        await writeSetupAttribute(meta.device, 0x0010, config.data);
        return { state: { output_mode: value } };
    },
};

/**
 * Converts CIE xy coordinates to Mireds using McCamy's formula.
 * @param {number} x - CIE x coordinate
 * @param {number} y - CIE y coordinate
 * @returns {number} Mireds (1,000,000 / CCT)
 */
function xyToMireds(x, y) {
    const n = (x - 0.3320) / (0.1858 - y);
    const cct = 449 * Math.pow(n, 3) + 3525 * Math.pow(n, 2) + 6823.3 * n + 5520.33;
    return Math.round(1000000 / cct);
}

/**
 * Safely retrieves the ubisys device setup endpoint (232).
 * @param {Device} device - zigbee-herdsman device object
 * @returns {Endpoint} The setup endpoint or throws if not found.
 */
function getSetupEndpoint(device) {
    const ep = device.getEndpoint(232);
    if (!ep) throw new Error('ubisys setup endpoint (232) not found');
    return ep;
}

/**
 * Writes a structured attribute to the manufacturer-specific setup cluster.
 * @param {Device} device - zigbee-herdsman device
 * @param {number} attrId - Attribute ID (e.g., 0x0010 for outputConfigurations)
 * @param {Array} elements - Array of Buffers
 * @param {number} dataType - Zcl.DataType (default: ARRAY)
 */
async function writeSetupAttribute(device, attrId, elements, dataType = Zcl.DataType.ARRAY) {
    const endpoint = getSetupEndpoint(device);
    await endpoint.writeStructured('manuSpecificUbisysDeviceSetup', [{
        attrId, selector: {}, dataType,
        elementData: { elementType: Zcl.DataType.OCTET_STR, elements }
    }]);
}

/**
 * Resolves a bitfield value for advanced options based on the current state.
 * @param {Object} state - Current device state
 * @param {string} key - The key being set
 * @param {boolean} value - New value for the key
 * @param {Array} bitMapping - List of keys mapping to bits 0, 1, 2...
 * @returns {number} The combined bitmask
 */
function resolveAdvancedOptions(state, key, value, bitMapping) {
    let mask = 0;
    bitMapping.forEach((mappedKey, index) => {
        const val = (key === mappedKey) ? value : (state[mappedKey] || false);
        if (val) mask |= (1 << index);
    });
    return mask;
}

const definition = {
    zigbeeModel: ['LD6'],
    model: 'LD6',
    vendor: 'ubisys',
    description: 'Zigbee/Bluetooth LED controller with 6 configurable outputs',
    endpoint: (device) => {
        return {
            l1: 1, l2: 5, l3: 6, l4: 7, l5: 8, l6: 9,
            s1: 2, s2: 3, s3: 4, setup: 232,
        };
    },
    meta: {
        multiEndpoint: true,
    },
    extend: [
        ...[1, 5, 6, 7, 8, 9].map(epNum => {
            const name = epNum === 1 ? 'l1' : `l${epNum === 5 ? 2 : epNum - 3}`;
            return {
                ...m.light({
                    endpointName: name,
                    colorTemp: { range: [153, 555] },
                    color: true,
                }),
                exposes: [], // Suppress static exposes
            };
        }),
        m.deviceAddCustomCluster('manuSpecificUbisysDeviceSetup', {
            ID: 0xfc00,
            attributes: {
                inputConfigurations: { ID: 0x0000, type: Zcl.DataType.ARRAY, write: true },
                inputActions: { ID: 0x0001, type: Zcl.DataType.ARRAY, write: true },
                outputConfigurations: { ID: 0x0010, type: Zcl.DataType.ARRAY, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        m.deviceAddCustomCluster('lightingColorCtrl', {
            ID: Zcl.Clusters.lightingColorCtrl.ID,
            attributes: {
                advancedOptions: { ID: 0x0000, type: Zcl.DataType.BITMAP8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        m.deviceAddCustomCluster('genLevelCtrl', {
            ID: Zcl.Clusters.genLevelCtrl.ID,
            attributes: {
                minimumOnLevel: { ID: 0x0000, type: Zcl.DataType.BITMAP8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
                ballastMinLevel: { ID: 0x0001, type: Zcl.DataType.UINT8, write: true },
                ballastMaxLevel: { ID: 0x0002, type: Zcl.DataType.UINT8, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        {
            fromZigbee: [
                fzOutputConfiguration,
                {
                    cluster: 'manuSpecificUbisysDeviceSetup',
                    type: ['attributeReport', 'readResponse'],
                    convert: (model, msg, publish, options, meta) => {
                        const result = {};
                        if (msg.data.inputConfigurations !== undefined) result.input_configurations = msg.data.inputConfigurations.map(b => b[0]);
                        if (msg.data.inputActions !== undefined) result.input_actions = msg.data.inputActions.map(b => b.toString('hex'));
                        return result;
                    },
                },
                {
                    cluster: 'lightingColorCtrl',
                    type: ['attributeReport', 'readResponse'],
                    convert: (model, msg, publish, options, meta) => {
                        if (msg.data.advancedOptions !== undefined) {
                            const val = msg.data.advancedOptions;
                            return {
                                advanced_options_no_color_white: (val & 0x01) > 0,
                                advanced_options_no_first_white_color: (val & 0x02) > 0,
                                advanced_options_no_second_white_color: (val & 0x04) > 0,
                                advanced_options_ignore_color_temp_range: (val & 0x08) > 0,
                                advanced_options_constant_luminous_flux: (val & 0x10) > 0,
                            };
                        }
                    },
                },
                {
                    cluster: 'genLevelCtrl',
                    type: ['attributeReport', 'readResponse'],
                    convert: (model, msg, publish, options, meta) => {
                        const result = {};
                        if (msg.data.minimumOnLevel !== undefined) result.minimum_on_level = msg.data.minimumOnLevel;
                        if (msg.data.ballastMinLevel !== undefined) result.ballast_min_level = msg.data.ballastMinLevel;
                        if (msg.data.ballastMaxLevel !== undefined) result.ballast_max_level = msg.data.ballastMaxLevel;
                        return result;
                    },
                }
            ],
            toZigbee: [
                tzOutputConfiguration,
                {
                    key: ['output_configuration'],
                    convertSet: async (entity, key, value, meta) => {
                        // Parse a raw hex string back into individual OCTET_STR elements for the array
                        const payload = Buffer.from(value, 'hex');
                        const data = [];
                        let offset = 4; // Skip the raw prefix [0x48, 0x41, 0x06, 0x00]
                        while (offset < payload.length) {
                            const len = payload[offset];
                            data.push(payload.slice(offset + 1, offset + 1 + len));
                            offset += len + 1;
                        }
                        await writeSetupAttribute(meta.device, 0x0010, data);
                        return { state: { output_configuration_raw: value } };
                    },
                    convertGet: async (entity, key, meta) => {
                        await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']);
                    },
                },
                {
                    key: ['input_configurations'],
                    convertSet: async (entity, key, value, meta) => {
                        const data = value.map(val => Buffer.from([val]));
                        await writeSetupAttribute(meta.device, 0x0000, data);
                        return { state: { input_configurations: value } };
                    },
                    convertGet: async (entity, key, meta) => {
                        await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputConfigurations']);
                    },
                },
                {
                    key: ['input_actions'],
                    convertSet: async (entity, key, value, meta) => {
                        const data = value.map(val => Buffer.from(val, 'hex'));
                        await writeSetupAttribute(meta.device, 0x0001, data);
                        return { state: { input_actions: value } };
                    },
                    convertGet: async (entity, key, meta) => {
                        await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputActions']);
                    },
                },
                {
                    key: [
                        'advanced_options_no_color_white', 'advanced_options_no_first_white_color', 'advanced_options_no_second_white_color',
                        'advanced_options_ignore_color_temp_range', 'advanced_options_constant_luminous_flux'
                    ],
                    convertSet: async (entity, key, value, meta) => {
                        // Handle the 1-byte bitmask attribute for advanced features
                        const bitMapping = [
                            'advanced_options_no_color_white',
                            'advanced_options_no_first_white_color',
                            'advanced_options_no_second_white_color',
                            'advanced_options_ignore_color_temp_range',
                            'advanced_options_constant_luminous_flux'
                        ];
                        const val = resolveAdvancedOptions(meta.state, key, value, bitMapping);
                        await entity.write('lightingColorCtrl', { advancedOptions: val }, { manufacturerCode: UBISYS_MANUFACTURER_CODE });
                        return { state: { [key]: value } };
                    },
                    convertGet: async (entity, key, meta) => {
                        await entity.read('lightingColorCtrl', ['advancedOptions'], { manufacturerCode: UBISYS_MANUFACTURER_CODE });
                    },
                },
                {
                    key: ['minimum_on_level', 'ballast_min_level', 'ballast_max_level'],
                    convertSet: async (entity, key, value, meta) => {
                        let attr, opts = {};
                        if (key === 'minimum_on_level') {
                            attr = 'minimumOnLevel';
                            opts.manufacturerCode = UBISYS_MANUFACTURER_CODE;
                        } else {
                            attr = key === 'ballast_min_level' ? 'ballastMinLevel' : 'ballastMaxLevel';
                        }
                        await entity.write('genLevelCtrl', { [attr]: value }, opts);
                        return { state: { [key]: value } };
                    },
                    convertGet: async (entity, key, meta) => {
                        let attr, opts = {};
                        if (key === 'minimum_on_level') {
                            attr = 'minimumOnLevel';
                            opts.manufacturerCode = UBISYS_MANUFACTURER_CODE;
                        } else {
                            attr = key === 'ballast_min_level' ? 'ballastMinLevel' : 'ballastMaxLevel';
                        }
                        await entity.read('genLevelCtrl', [attr], opts);
                    },
                },
                {
                    key: ['calibration'],
                    convertSet: async (entity, key, value, meta) => {
                        let cal;
                        try {
                            if (!value || (typeof value === 'string' && value.trim() === '')) {
                                throw new Error('Empty or missing calibration value');
                            }
                            cal = typeof value === 'string' ? JSON.parse(value) : value;
                        } catch (err) {
                            throw new Error(`Invalid calibration JSON: ${err.message}. Expected format: {"channel": 1..6, "x": 0..1, "y": 0..1, "flux": 0..254}`);
                        }

                        if (!cal || typeof cal !== 'object') {
                            throw new Error('Calibration must be a JSON object');
                        }

                        if (cal.channel === undefined || cal.channel < 1 || cal.channel > 6) {
                            throw new Error('Calibration must specify a "channel" between 1 and 6');
                        }

                        const setupEp = getSetupEndpoint(meta.device);
                        const resp = await setupEp.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']);
                        if (!resp || !resp.outputConfigurations) {
                            throw new Error('Could not read current output configurations from device');
                        }

                        // Modify only the requested channel in the existing configuration array
                        const elements = resp.outputConfigurations.map((buf, i) => {
                            const el = Buffer.from(buf);
                            if (i === (cal.channel - 1)) {
                                if (cal.flux !== undefined) el[1] = cal.flux;
                                if (cal.x !== undefined) {
                                    const x = Math.round(cal.x * 65536);
                                    el[2] = x & 0xFF;
                                    el[3] = (x >> 8) & 0xFF;
                                }
                                if (cal.y !== undefined) {
                                    const y = Math.round(cal.y * 65536);
                                    el[4] = y & 0xFF;
                                    el[5] = (y >> 8) & 0xFF;
                                }
                            }
                            return el;
                        });

                        await writeSetupAttribute(meta.device, 0x0010, elements);
                        return { state: { calibration_status: `Updated channel ${cal.channel}` } };
                    },
                }
            ],
            isModernExtend: true,
        }
    ],
    exposes: (device, options) => {
        const exposesList = [];
        // Global device settings
        exposesList.push(e.enum('output_mode', ea.SET, Object.keys(OUTPUT_CONFIGURATIONS)));
        exposesList.push(e.text('output_configuration', ea.SET));
        exposesList.push(e.text('output_configuration_raw', ea.STATE));
        exposesList.push(e.numeric('ballast_min_level', ea.ALL).withValueMin(1).withValueMax(254));
        exposesList.push(e.numeric('ballast_max_level', ea.ALL).withValueMin(1).withValueMax(254));
        exposesList.push(e.binary('advanced_options_no_color_white', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_no_first_white_color', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_no_second_white_color', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_ignore_color_temp_range', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_constant_luminous_flux', ea.ALL, true, false));
        exposesList.push(e.numeric('minimum_on_level', ea.ALL).withValueMin(1).withValueMax(254));
        exposesList.push(e.list('input_configurations', ea.ALL, e.numeric('value', ea.ALL)));
        exposesList.push(e.list('input_actions', ea.ALL, e.text('value', ea.ALL)));
        exposesList.push(e.text('calibration', ea.SET));
        exposesList.push(e.text('calibration_status', ea.STATE));

        /**
         * Dynamic Feature Probing
         * The LD6 can be anything from 6 dimmers to 1 RGBWW + 1 CCT. 
         * We check the actual clusters and attributes on each endpoint to 
         * decide which controls to show in the UI.
         */
        if (device && typeof device.getEndpoint === 'function') {
            const setupEp = device.getEndpoint(232);
            // Read current PWM config to derive physical CCT limits
            const outputConfigs = setupEp?.getClusterAttributeValue('manuSpecificUbisysDeviceSetup', 'outputConfigurations');

            [1, 5, 6, 7, 8, 9].forEach(epNum => {
                const ep = device.getEndpoint(epNum);
                if (ep) {
                    const name = epNum === 1 ? 'l1' : `l${epNum === 5 ? 2 : epNum - 3}`;
                    const colorCapabilities = ep.getClusterAttributeValue('lightingColorCtrl', 'colorCapabilities');

                    // 1. Determine capabilities (Color Temp vs Color XY)
                    const hasColorTemp = (colorCapabilities !== undefined) ? (colorCapabilities & 0x10) : (ep.getClusterAttributeValue('lightingColorCtrl', 'colorTemperature') !== undefined);
                    const hasColorXY = (colorCapabilities !== undefined) ? (colorCapabilities & 0x08) : (ep.getClusterAttributeValue('lightingColorCtrl', 'currentX') !== undefined);
                    const hasBrightness = ep.supportsInputCluster('genLevelCtrl');
                    const hasOnOff = ep.supportsInputCluster('genOnOff');

                    // 2. Calculate dynamic CCT range from calibration data if available
                    if (hasColorTemp) {
                        let range = [153, 500]; // Default CCT range
                        if (outputConfigs) {
                            let cwMireds, wwMireds;
                            outputConfigs.forEach((buf) => {
                                const el = Buffer.from(buf);
                                const epFunc = el[0];
                                const channelEp = (epFunc >> 4) & 0x0F;
                                const func = epFunc & 0x0F;
                                if (channelEp === epNum) {
                                    const x = (el[2] | (el[3] << 8)) / 65536;
                                    const y = (el[4] | (el[5] << 8)) / 65536;
                                    const mireds = xyToMireds(x, y);
                                    if (func === 1) cwMireds = mireds; // Cold White channel
                                    if (func === 2) wwMireds = mireds; // Warm White channel
                                }
                            });
                            if (cwMireds && wwMireds) {
                                range = [Math.min(cwMireds, wwMireds), Math.max(cwMireds, wwMireds)];
                            }
                        }

                        // 3. Expose the appropriate light type
                        if (hasColorXY) {
                            exposesList.push(e.light_brightness_colortemp_colorxy(range).withEndpoint(name));
                        } else {
                            exposesList.push(e.light_brightness_colortemp(range).withEndpoint(name));
                        }
                    } else if (hasColorXY) {
                        exposesList.push(e.light_brightness_colorxy().withEndpoint(name));
                    } else if (hasBrightness) {
                        exposesList.push(e.light_brightness().withEndpoint(name));
                    } else if (hasOnOff) {
                        exposesList.push(e.light_onoff().withEndpoint(name));
                    }
                }
            });
        }
        return exposesList;
    },
    configure: async (device, coordinatorEndpoint, definition) => {
        const setupEp = device.getEndpoint(232);
        if (setupEp) {
            /** 
             * Read the current PWM configuration on startup. 
             * This allows 'exposes' to correctly calculate CCT ranges even 
             * before the user makes any changes.
             */
            try { await setupEp.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']); } catch (e) { /* Do nothing if read fails */ }
        }
    },
    ota: true,
};

export default definition;
