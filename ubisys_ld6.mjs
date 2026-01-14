/**
 * Zigbee2MQTT External Converter for ubisys LD6 LED Controller
 * 
 * This converter provides support for the ubisys LD6 6-channel LED controller.
 * It supports setting output configurations (e.g., enable CCT, RGB, RGBW, RGBWW modes).
 * 
 * The LD6 has dynamic endpoints based on the output configuration:
 * - Endpoint 1: Primary light
 * - Endpoints 5-9: Additional lights (depending on configuration)
 * - Endpoints 2-4: Dimmer switches (inputs)
 * - Endpoint 232: Device management
 * - Endpoint 242: Green Power
 * 
 * Usage:
 * 1. Place this file in your zigbee2mqtt data folder under: external_converters/ubisys_ld6.mjs
 * 2. Restart Zigbee2MQTT
 * 3. Pair the LD6 device
 * 4. Use MQTT or the frontend to set the output_mode to configure the device
 * 
 * Note: After changing the output configuration, the device may need to be re-interviewed
 * to properly recognize all endpoints.
 */

import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import * as reporting from 'zigbee-herdsman-converters/lib/reporting';
import { Zcl } from 'zigbee-herdsman';
import { deviceAddCustomCluster } from 'zigbee-herdsman-converters/lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

// Manufacturer code for ubisys
const UBISYS_MANUFACTURER_CODE = Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH; // 0x10F2

// Predefined output configurations from the technical reference
// Format: Array header (0x48=array, 0x41=raw data type, 0x06,0x00=6 elements)
// Each element: length (0x06), EndpointAndFunction, Flux, CIE_x (2 bytes LE), CIE_y (2 bytes LE)
const OUTPUT_CONFIGURATIONS = {
    // === One Light Source configurations ===
    '1x_dimmable': {
        description: '1x Dimmable (mono) - Single channel white',
        endpoints: [1],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_cct': {
        description: '1x CCT / Tunable White (Cool/Warm) - 2 channel',
        endpoints: [1],
        data: [
            [0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH1: EP1, cool white (CW)
            [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH2: EP1, warm white (WW)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_rgb': {
        description: '1x RGB Color - 3 channel',
        endpoints: [1],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_rgbw': {
        description: '1x RGBW (RGB + neutral White) - 4 channel',
        endpoints: [1],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x11, 0xfe, 0x64, 0x61, 0x72, 0x60],  // CH4: EP1, white (W) - neutral
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_rgbww': {
        description: '1x RGBWW (RGB + Cool/Warm White) - 5 channel',
        endpoints: [1],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH4: EP1, cool white (CW)
            [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH5: EP1, warm white (WW)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_extended_gamut': {
        description: '1x Extended Color Gamut (R/A/G/T/B/V) - 6 channel',
        endpoints: [1],
        data: [
            [0x13, 0x45, 0x86, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x16, 0xc6, 0x59, 0x9a, 0x80, 0x65],  // CH2: EP1, amber (A)
            [0x14, 0xfe, 0x39, 0x1d, 0x82, 0xd3],  // CH3: EP1, green (G)
            [0x17, 0xb4, 0x9e, 0x0b, 0x83, 0x4b],  // CH4: EP1, turquoise (T)
            [0x15, 0x4d, 0xc6, 0x1f, 0xcc, 0x0e],  // CH5: EP1, blue (B)
            [0x18, 0x6c, 0x2d, 0x2c, 0x3a, 0x01],  // CH6: EP1, violet (V)
        ],
    },
    // === Two Light Sources configurations ===
    '2x_dimmable': {
        description: '2x Dimmable (mono) - 2 independent white channels',
        endpoints: [1, 5],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x50, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: EP5, mono (M)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '2x_cct': {
        description: '2x CCT / Tunable White - 2 independent CCT lights',
        endpoints: [1, 5],
        data: [
            [0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH1: EP1, cool white (CW)
            [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH2: EP1, warm white (WW)
            [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH3: EP5, cool white (CW)
            [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH4: EP5, warm white (WW)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '1x_rgb_1x_cct': {
        description: '1x RGB + 1x CCT - Color + Tunable White',
        endpoints: [1, 5],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH5: EP5, cool white (CW)
            [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH6: EP5, warm white (WW)
        ],
    },
    '1x_rgbw_1x_cct': {
        description: '1x RGBW + 1x CCT',
        endpoints: [1, 5],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x11, 0xfe, 0x64, 0x61, 0x72, 0x60],  // CH4: EP1, white (W)
            [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH5: EP5, cool white (CW)
            [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH6: EP5, warm white (WW)
        ],
    },
    '2x_rgb': {
        description: '2x RGB Color - 2 independent color lights',
        endpoints: [1, 5],
        data: [
            [0x13, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH1: EP1, red (R)
            [0x14, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH2: EP1, green (G)
            [0x15, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH3: EP1, blue (B)
            [0x53, 0x47, 0x06, 0xb1, 0xef, 0x4e],  // CH4: EP5, red (R)
            [0x54, 0xa0, 0x39, 0x1d, 0x82, 0xd3],  // CH5: EP5, green (G)
            [0x55, 0x42, 0xc6, 0x1f, 0xcc, 0x0e],  // CH6: EP5, blue (B)
        ],
    },
    // === Three Light Sources configurations ===
    '3x_dimmable': {
        description: '3x Dimmable (mono)',
        endpoints: [1, 5, 6],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x50, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: EP5, mono (M)
            [0x60, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: EP6, mono (M)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    '3x_cct': {
        description: '3x CCT / Tunable White',
        endpoints: [1, 5, 6],
        data: [
            [0x11, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH1: EP1, cool white (CW)
            [0x12, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH2: EP1, warm white (WW)
            [0x51, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH3: EP5, cool white (CW)
            [0x52, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH4: EP5, warm white (WW)
            [0x61, 0xfe, 0x42, 0x50, 0xd9, 0x52],  // CH5: EP6, cool white (CW)
            [0x62, 0xfe, 0xb9, 0x75, 0x1d, 0x69],  // CH6: EP6, warm white (WW)
        ],
    },
    // === Four Light Sources configurations ===
    '4x_dimmable': {
        description: '4x Dimmable (mono)',
        endpoints: [1, 5, 6, 7],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x50, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: EP5, mono (M)
            [0x60, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: EP6, mono (M)
            [0x70, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: EP7, mono (M)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: unused
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    // === Five Light Sources configurations ===
    '5x_dimmable': {
        description: '5x Dimmable (mono)',
        endpoints: [1, 5, 6, 7, 8],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x50, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: EP5, mono (M)
            [0x60, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: EP6, mono (M)
            [0x70, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: EP7, mono (M)
            [0x80, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: EP8, mono (M)
            [0x00, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: unused
        ],
    },
    // === Six Light Sources configurations ===
    '6x_dimmable': {
        description: '6x Dimmable (mono)',
        endpoints: [1, 5, 6, 7, 8, 9],
        data: [
            [0x10, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH1: EP1, mono (M)
            [0x50, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH2: EP5, mono (M)
            [0x60, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH3: EP6, mono (M)
            [0x70, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH4: EP7, mono (M)
            [0x80, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH5: EP8, mono (M)
            [0x90, 0xff, 0xff, 0xff, 0xff, 0xff],  // CH6: EP9, mono (M)
        ],
    },
};

/**
 * Helper function to build the ZCL array payload for output configuration
 */
function buildOutputConfigPayload(data) {
    // ZCL Array format: dataType(0x48=array) + elementType(0x41=raw) + count(uint16 LE) + elements
    const elements = data.map(el => [el.length, ...el]);
    const payload = [
        0x48,  // Array data type
        0x41,  // Element type: raw data
        0x06, 0x00,  // Element count: 6 (little-endian)
        ...elements.flat()
    ];
    return payload;
}

/**
 * Helper function to parse output configuration from device
 */
function parseOutputConfig(data) {
    // Skip array header (4 bytes) and parse elements
    if (!data || data.length < 4) return null;

    const result = {
        channels: [],
        raw: Buffer.from(data).toString('hex'),
    };

    // Parse each channel
    let offset = 4;  // Skip header
    for (let i = 0; i < 6; i++) {
        if (offset >= data.length) break;
        const len = data[offset];
        if (offset + len > data.length) break;

        const epFunc = data[offset + 1];
        const endpoint = (epFunc >> 4) & 0x0F;
        const func = epFunc & 0x0F;
        const flux = data[offset + 2];

        const funcNames = ['M', 'CW', 'WW', 'R', 'G', 'B', 'A', 'T', 'V', 'F'];
        const funcName = funcNames[func] || 'unknown';

        result.channels.push({
            channel: i + 1,
            endpoint: endpoint === 0 ? null : (endpoint < 5 ? endpoint : endpoint),
            function: func === 0 && endpoint === 0 ? 'unused' : funcName,
            flux: flux === 0xff ? 'default' : flux,
        });

        offset += len + 1;  // +1 for length byte
    }

    // Try to identify the mode
    for (const [mode, config] of Object.entries(OUTPUT_CONFIGURATIONS)) {
        const expectedPayload = buildOutputConfigPayload(config.data);
        if (Buffer.compare(Buffer.from(data), Buffer.from(expectedPayload)) === 0) {
            result.mode = mode;
            result.description = config.description;
            break;
        }
    }

    if (!result.mode) {
        result.mode = 'custom';
        result.description = 'Custom configuration';
    }

    return result;
}

// Add custom Device Setup cluster with outputConfigurations attribute
const addCustomClusterLD6DeviceSetup = () =>
    deviceAddCustomCluster('manuSpecificUbisysDeviceSetup', {
        ID: 0xfc00,
        attributes: {
            inputConfigurations: { ID: 0x0000, type: Zcl.DataType.ARRAY, write: true },
            inputActions: { ID: 0x0001, type: Zcl.DataType.ARRAY, write: true },
            outputConfigurations: { ID: 0x0010, type: Zcl.DataType.ARRAY, write: true },
            outputEndpoints: { ID: 0x0011, type: Zcl.DataType.BITMAP16 },
        },
        commands: {},
        commandsResponse: {},
    });

// Add AdvancedOptions to Color Control cluster
const addCustomClusterLD6ColorControl = () =>
    deviceAddCustomCluster('lightingColorCtrl', {
        ID: Zcl.Clusters.lightingColorCtrl.ID,
        attributes: {
            advancedOptions: { ID: 0x0000, type: Zcl.DataType.UINT8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
            startUpColorTemperatureMireds: { ID: 0x4010, type: Zcl.DataType.UINT16, write: true },
        },
        commands: {},
        commandsResponse: {},
    });

// Add MinimumOnLevel to Level Control cluster
const addCustomClusterLD6LevelCtrl = () =>
    deviceAddCustomCluster('genLevelCtrl', {
        ID: Zcl.Clusters.genLevelCtrl.ID,
        attributes: {
            minimumOnLevel: { ID: 0x0000, type: Zcl.DataType.UINT8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
        },
        commands: {},
        commandsResponse: {},
    });

// Add Zigbee Direct (Bluetooth) Configuration Cluster
const addCustomClusterLD6ZigbeeDirect = () =>
    deviceAddCustomCluster('zigbeeDirectConfig', {
        ID: 0x003d,
        attributes: {
            interfaceState: { ID: 0x0000, type: Zcl.DataType.BITMAP8, write: true },
            anonymousJoinTimeout: { ID: 0x0001, type: Zcl.DataType.UINT24, write: true },
        },
        commands: {
            configureZigbeeDirectInterface: {
                ID: 0x00,
                parameters: [
                    { name: 'interfaceState', type: Zcl.DataType.UINT8 },
                ],
            },
            configureZigbeeDirectAnonymousJoinTimeout: {
                ID: 0x01,
                parameters: [
                    { name: 'anonymousJoinTimeout', type: Zcl.DataType.UINT24 },
                ],
            },
        },
        commandsResponse: {},
    });

// Custom fromZigbee converter for output configuration
const fzOutputConfiguration = {
    cluster: 'manuSpecificUbisysDeviceSetup',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        if (msg.data.outputConfigurations !== undefined && Array.isArray(msg.data.outputConfigurations)) {
            // Reconstruct raw payload from Z2M parsed array of buffers
            // Header: 0x48 (Array), 0x41 (OctetStr), 0x06, 0x00 (Count)
            const header = [0x48, 0x41, 0x06, 0x00];
            const elements = msg.data.outputConfigurations.map(buf => {
                if (Buffer.isBuffer(buf)) {
                    return [buf.length, ...buf];
                }
                return [];
            });
            const fullRaw = [...header, ...elements.flat()];

            const parsed = parseOutputConfig(fullRaw);
            if (parsed) {
                result.output_mode = parsed.mode;
                result.output_mode_description = parsed.description;
                result.output_configuration_raw = parsed.raw;
            }
        }

        if (msg.data.inputConfigurations !== undefined) {
            result.input_configurations = [...msg.data.inputConfigurations];
        }

        if (msg.data.inputActions !== undefined) {
            result.input_actions = msg.data.inputActions.map(el =>
                typeof el === 'object' ? Object.values(el) : el
            );
        }

        return Object.keys(result).length > 0 ? result : undefined;
    },
};

// Custom toZigbee converter for output configuration
const tzOutputConfiguration = {
    key: ['output_mode', 'output_configuration'],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(232);

        if (key === 'output_mode') {
            const config = OUTPUT_CONFIGURATIONS[value];
            if (!config) {
                const modes = Object.keys(OUTPUT_CONFIGURATIONS).join(', ');
                throw new Error(`Unknown output mode: ${value}. Available modes: ${modes}`);
            }

            // Build and write the output configuration
            const payload = buildOutputConfigPayload(config.data);

            await endpoint.writeStructured(
                'manuSpecificUbisysDeviceSetup',
                [{
                    attrId: 0x0010,  // outputConfigurations
                    selector: {},
                    dataType: Zcl.DataType.ARRAY,
                    elementData: {
                        elementType: Zcl.DataType.OCTET_STR,
                        elements: config.data,
                    },
                }],
                {}
            );

            // The device reconfigures dynamically, wait a moment
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Notify user that re-interview may be needed
            if (meta.logger) {
                meta.logger.info(`LD6 output mode set to "${value}". Device may need re-interview to discover new endpoints.`);
            }

            return {
                state: {
                    output_mode: value,
                    output_mode_description: config.description,
                },
            };
        }

        if (key === 'output_configuration') {
            // Allow raw configuration as hex string
            const configData = Buffer.from(value, 'hex');

            await endpoint.write(
                'manuSpecificUbisysDeviceSetup',
                { outputConfigurations: [...configData] },
                {}
            );

            await new Promise(resolve => setTimeout(resolve, 3000));

            return { state: { output_configuration_raw: value } };
        }
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(232);
        await endpoint.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations'], {});
    },
};

// Custom toZigbee converter for input configuration
const tzInputConfiguration = {
    key: ['input_configurations', 'input_actions'],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(232);

        if (key === 'input_configurations') {
            // Expect array of 3 bytes (one per input)
            // Values: 0x00=enabled, 0x40=inverted, 0x80=disabled
            await endpoint.writeStructured(
                'manuSpecificUbisysDeviceSetup',
                [{
                    attrId: 0x0000,
                    selector: {},
                    dataType: Zcl.DataType.ARRAY,
                    elementData: {
                        elementType: Zcl.DataType.DATA8,
                        elements: value,
                    },
                }],
                {}
            );
            return { state: { input_configurations: value } };
        }

        if (key === 'input_actions') {
            // Expect array of arrays (raw input actions)
            await endpoint.writeStructured(
                'manuSpecificUbisysDeviceSetup',
                [{
                    attrId: 0x0001,
                    selector: {},
                    dataType: Zcl.DataType.ARRAY,
                    elementData: {
                        elementType: Zcl.DataType.OCTET_STR,
                        elements: value,
                    },
                }],
                {}
            );
            return { state: { input_actions: value } };
        }
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(232);
        if (key === 'input_configurations') {
            await endpoint.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations'], {});
        }
        if (key === 'input_actions') {
            await endpoint.read('manuSpecificUbisysDeviceSetup', ['inputActions'], {});
        }
    },
};

// Custom converter for AdvancedOptions
const fzAdvancedOptions = {
    cluster: 'lightingColorCtrl',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.advancedOptions !== undefined) {
            const value = msg.data.advancedOptions;
            return {
                advanced_options_no_color_white: (value & 0x01) > 0,
                advanced_options_no_first_white_color: (value & 0x02) > 0,
                advanced_options_no_second_white_color: (value & 0x04) > 0,
            };
        }
    },
};

const tzAdvancedOptions = {
    key: ['advanced_options_no_color_white', 'advanced_options_no_first_white_color', 'advanced_options_no_second_white_color'],
    convertSet: async (entity, key, value, meta) => {
        const state = meta.state;
        const noColorWhite = key === 'advanced_options_no_color_white' ? value : (state.advanced_options_no_color_white || false);
        const noFirstWhiteColor = key === 'advanced_options_no_first_white_color' ? value : (state.advanced_options_no_first_white_color || false);
        const noSecondWhiteColor = key === 'advanced_options_no_second_white_color' ? value : (state.advanced_options_no_second_white_color || false);

        let val = 0;
        if (noColorWhite) val |= 0x01;
        if (noFirstWhiteColor) val |= 0x02;
        if (noSecondWhiteColor) val |= 0x04;

        await entity.write('lightingColorCtrl', { advancedOptions: val }, { manufacturerCode: UBISYS_MANUFACTURER_CODE });
        return { state: { [key]: value } };
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('lightingColorCtrl', ['advancedOptions'], { manufacturerCode: UBISYS_MANUFACTURER_CODE });
    },
};
const fzBallast = {
    cluster: 'lightingBallastConfig',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.minLevel !== undefined) result.ballast_min_level = msg.data.minLevel;
        if (msg.data.maxLevel !== undefined) result.ballast_max_level = msg.data.maxLevel;
        return result;
    },
};

const tzBallast = {
    key: ['ballast_min_level', 'ballast_max_level'],
    convertSet: async (entity, key, value, meta) => {
        const attr = key === 'ballast_min_level' ? 'minLevel' : 'maxLevel';
        await entity.write('lightingBallastConfig', { [attr]: value });
        return { state: { [key]: value } };
    },
    convertGet: async (entity, key, meta) => {
        const attr = key === 'ballast_min_level' ? 'minLevel' : 'maxLevel';
        await entity.read('lightingBallastConfig', [attr]);
    },
};

const fzLightOptions = {
    cluster: 'genLevelCtrl',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.onOffTransitionTime !== undefined) result.on_off_transition_time = msg.data.onOffTransitionTime;
        if (msg.data.onLevel !== undefined) result.on_level = msg.data.onLevel === 0xFF ? 'previous' : msg.data.onLevel;
        if (msg.data.startUpLevel !== undefined) {
            result.startup_level = msg.data.startUpLevel === 0xFF ? 'previous' : (msg.data.startUpLevel === 0xFE ? 'keep' : msg.data.startUpLevel);
        }
        if (msg.data.minimumOnLevel !== undefined) result.minimum_on_level = msg.data.minimumOnLevel;
        return result;
    },
};

const fzLightStartup = {
    cluster: 'genOnOff',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.startUpOnOff !== undefined) {
            const values = { 0x00: 'off', 0x01: 'on', 0x02: 'toggle', 0xFF: 'previous' };
            result.startup_on_off = values[msg.data.startUpOnOff];
        }
        return result;
    },
};

const fzColorStartup = {
    cluster: 'lightingColorCtrl',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.startUpColorTemperatureMireds !== undefined) {
            result.startup_color_temperature = msg.data.startUpColorTemperatureMireds;
        }
        return result;
    },
};

const fzZigbeeDirect = {
    cluster: 'zigbeeDirectConfig',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        if (msg.data.interfaceState !== undefined) result.zigbee_direct_interface = (msg.data.interfaceState & 0x01) ? 'enabled' : 'disabled';
        if (msg.data.anonymousJoinTimeout !== undefined) result.zigbee_direct_anonymous_join_timeout = msg.data.anonymousJoinTimeout;
        return result;
    },
};

const tzLightOptions = {
    key: ['on_off_transition_time', 'on_level', 'startup_level', 'minimum_on_level'],
    convertSet: async (entity, key, value, meta) => {
        if (key === 'on_off_transition_time') {
            await entity.write('genLevelCtrl', { onOffTransitionTime: value });
            return { state: { [key]: value } };
        }
        if (key === 'on_level') {
            const val = value === 'previous' ? 0xFF : parseInt(value);
            await entity.write('genLevelCtrl', { onLevel: val });
            return { state: { [key]: value } };
        }
        if (key === 'startup_level') {
            let val;
            if (value === 'previous') val = 0xFF;
            else if (value === 'keep') val = 0xFE;
            else val = parseInt(value);
            await entity.write('genLevelCtrl', { startUpLevel: val });
            return { state: { [key]: value } };
        }
        if (key === 'minimum_on_level') {
            await entity.write('genLevelCtrl', { minimumOnLevel: value }, { manufacturerCode: 0x10f2 });
            return { state: { [key]: value } };
        }
    },
    convertGet: async (entity, key, meta) => {
        const attr = {
            on_off_transition_time: 'onOffTransitionTime',
            on_level: 'onLevel',
            startup_level: 'startUpLevel',
            minimum_on_level: 'minimumOnLevel',
        }[key];
        await entity.read('genLevelCtrl', [attr], key === 'minimum_on_level' ? { manufacturerCode: 0x10f2 } : {});
    },
};

const tzLightStartup = {
    key: ['startup_on_off'],
    convertSet: async (entity, key, value, meta) => {
        const values = { 'off': 0x00, 'on': 0x01, 'toggle': 0x02, 'previous': 0xFF };
        await entity.write('genOnOff', { startUpOnOff: values[value] });
        return { state: { [key]: value } };
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('genOnOff', ['startUpOnOff']);
    },
};

const tzColorStartup = {
    key: ['startup_color_temperature'],
    convertSet: async (entity, key, value, meta) => {
        await entity.write('lightingColorCtrl', { startUpColorTemperatureMireds: value });
        return { state: { [key]: value } };
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('lightingColorCtrl', ['startUpColorTemperatureMireds']);
    },
};

const tzZigbeeDirect = {
    key: ['zigbee_direct_interface', 'zigbee_direct_anonymous_join_timeout'],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(232);
        if (key === 'zigbee_direct_interface') {
            const val = value === 'enabled' ? 0x01 : 0x00;
            await endpoint.command('zigbeeDirectConfig', 'configureZigbeeDirectInterface', { interfaceState: val });
            return { state: { [key]: value } };
        }
        if (key === 'zigbee_direct_anonymous_join_timeout') {
            await endpoint.command('zigbeeDirectConfig', 'configureZigbeeDirectAnonymousJoinTimeout', { anonymousJoinTimeout: value });
            return { state: { [key]: value } };
        }
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(232);
        const attr = key === 'zigbee_direct_interface' ? 'interfaceState' : 'anonymousJoinTimeout';
        await endpoint.read('zigbeeDirectConfig', [attr]);
    },
};

const tzCalibration = {
    key: ['calibration'],
    convertSet: async (entity, key, value, meta) => {
        // value: {"channel": 1..6, "x": 0..1, "y": 0..1, "flux": 0..254}
        let cal;
        try {
            cal = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
            throw new Error('Calibration value must be a valid JSON string');
        }

        if (typeof cal !== 'object' || cal === null) throw new Error('Calibration value must be a JSON object');
        if (cal.channel === undefined) throw new Error('Calibration must specify "channel" (1-6)');

        const channelIdx = cal.channel - 1;
        if (channelIdx < 0 || channelIdx > 5) throw new Error('Invalid channel index (1-6)');

        if (cal.flux !== undefined && (typeof cal.flux !== 'number' || cal.flux < 0 || cal.flux > 254)) {
            throw new Error('Flux must be a number between 0 and 254');
        }

        if (cal.x !== undefined && (typeof cal.x !== 'number' || cal.x < 0 || cal.x > 1)) {
            throw new Error('CIE x must be a number between 0.0 and 1.0');
        }

        if (cal.y !== undefined && (typeof cal.y !== 'number' || cal.y < 0 || cal.y > 1)) {
            throw new Error('CIE y must be a number between 0.0 and 1.0');
        }

        const endpoint = meta.device.getEndpoint(232);
        const resp = await endpoint.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']);

        if (!Array.isArray(resp.outputConfigurations)) {
            throw new Error('Device reported invalid configuration format');
        }

        const elements = resp.outputConfigurations.map((buf, i) => {
            // Create a copy of the buffer
            const el = Buffer.from(buf);

            if (i === channelIdx) {
                // Buffer structure: [EndpointAndFunc, Flux, X_L, X_H, Y_L, Y_H]
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

        await endpoint.writeStructured(
            'manuSpecificUbisysDeviceSetup',
            [{
                attrId: 0x0010,
                selector: {},
                dataType: Zcl.DataType.ARRAY,
                elementData: {
                    elementType: Zcl.DataType.OCTET_STR,
                    elements: elements,
                },
            }],
            {}
        );

        return { state: { calibration_status: `Updated channel ${cal.channel}` } };
    },
};

// Generate base light settings for all possible endpoints to get the converters
const lightSettings = m.light({
    colorTemp: { range: [153, 555] },  // ~1800K-6500K
    color: { modes: ['xy', 'hs'] },
    endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
});

// Define the device
const definition = {
    zigbeeModel: ['LD6'],
    model: 'LD6',
    vendor: 'ubisys',
    description: 'Zigbee/Bluetooth LED controller with 6 configurable outputs',
    fromZigbee: [
        fzOutputConfiguration,
        fzAdvancedOptions,
        fzBallast,
        fzLightOptions,
        fzLightStartup,
        fzColorStartup,
        fzZigbeeDirect,
        ...lightSettings.fromZigbee,
    ],
    toZigbee: [
        tzOutputConfiguration,
        tzInputConfiguration,
        tzAdvancedOptions,
        tzBallast,
        tzLightOptions,
        tzLightStartup,
        tzColorStartup,
        tzZigbeeDirect,
        tzCalibration,
        ...lightSettings.toZigbee,
    ],
    exposes: (device, options) => {
        const exposesList = [];

        // Helper to add light options to an endpoint
        const addLightOptions = (list, endpointName) => {
            list.push(e.numeric('on_off_transition_time', ea.ALL).withValueMin(0).withValueMax(6553).withUnit('0.1s').withDescription('Fade time for on/off').withEndpoint(endpointName));
            list.push(e.numeric('on_level', ea.ALL).withValueMin(1).withValueMax(254).withDescription('Level on "ON" command').withEndpoint(endpointName));
            list.push(e.numeric('startup_level', ea.ALL).withValueMin(1).withValueMax(254).withDescription('Level after reboot').withEndpoint(endpointName));
            list.push(e.numeric('minimum_on_level', ea.ALL).withValueMin(1).withValueMax(254).withDescription('Minimum level when turning on').withEndpoint(endpointName));
            list.push(e.enum('startup_on_off', ea.ALL, ['off', 'on', 'toggle', 'previous']).withDescription('Status after reboot').withEndpoint(endpointName));
            list.push(e.numeric('startup_color_temperature', ea.ALL).withValueMin(153).withValueMax(555).withUnit('mired').withDescription('Color temperature after reboot').withEndpoint(endpointName));
        };

        // Helper to determine light features
        const addLightExpose = (ep, endpointName) => {
            const hasColorCtrl = typeof ep.supportsInputCluster === 'function' && ep.supportsInputCluster('lightingColorCtrl');
            const hasLevelCtrl = typeof ep.supportsInputCluster === 'function' && ep.supportsInputCluster('genLevelCtrl');

            if (hasColorCtrl) {
                // Try to determine capabilities from the cluster attribute
                // 0x01: Hue/Sat, 0x08: XY, 0x10: ColorTemp
                let colorCaps = 0x19; // Default to XY (0x08) + CT (0x10) + HS (0x01) if unknown
                let minMireds = 153;
                let maxMireds = 555;

                if (ep.clusters && ep.clusters.lightingColorCtrl && ep.clusters.lightingColorCtrl.attributes) {
                    if (ep.clusters.lightingColorCtrl.attributes.colorCapabilities !== undefined) {
                        colorCaps = ep.clusters.lightingColorCtrl.attributes.colorCapabilities;
                    }
                    if (ep.clusters.lightingColorCtrl.attributes.colorTempPhysicalMinMireds !== undefined) {
                        minMireds = ep.clusters.lightingColorCtrl.attributes.colorTempPhysicalMinMireds;
                    }
                    if (ep.clusters.lightingColorCtrl.attributes.colorTempPhysicalMaxMireds !== undefined) {
                        maxMireds = ep.clusters.lightingColorCtrl.attributes.colorTempPhysicalMaxMireds;
                    }
                }

                const supportsColor = (colorCaps & 0x09) > 0; // XY (0x08) or HS (0x01)
                const supportsTemp = (colorCaps & 0x10) > 0; // CT (0x10)

                if (supportsColor && supportsTemp) {
                    exposesList.push(e.light_brightness_colortemp_colorxy([minMireds, maxMireds]).withEndpoint(endpointName));
                } else if (supportsColor) {
                    exposesList.push(e.light_brightness_colorxy().withEndpoint(endpointName));
                } else if (supportsTemp) {
                    exposesList.push(e.light_brightness_colortemp([minMireds, maxMireds]).withEndpoint(endpointName));
                } else {
                    // Fallback
                    exposesList.push(e.light_brightness_colortemp_colorxy([minMireds, maxMireds]).withEndpoint(endpointName));
                }
                addLightOptions(exposesList, endpointName);
            } else if (hasLevelCtrl) {
                exposesList.push(e.light_brightness().withEndpoint(endpointName));
                addLightOptions(exposesList, endpointName);
            }
        };

        // Primary light on endpoint 1 (l1) - always exists
        if (device && typeof device.getEndpoint === 'function' && device.getEndpoint(1)) {
            addLightExpose(device.getEndpoint(1), 'l1');
        } else {
            // Fallback for initial load
            exposesList.push(e.light_brightness_colortemp_colorxy().withEndpoint('l1'));
            addLightOptions(exposesList, 'l1');
        }

        // Check if additional endpoints exist (5, 6, 7, 8, 9)
        if (device && typeof device.getEndpoint === 'function') {
            for (const epNum of [5, 6, 7, 8, 9]) {
                const ep = device.getEndpoint(epNum);
                if (ep) {
                    const endpointName = `l${epNum === 5 ? 2 : epNum - 3}`;
                    addLightExpose(ep, endpointName);
                }
            }
        }

        // Output configuration mode selector
        exposesList.push(
            e.enum('output_mode', ea.ALL, Object.keys(OUTPUT_CONFIGURATIONS))
                .withDescription('Output configuration mode. Changes how the 6 output channels are mapped to light endpoints. ' +
                    'After changing, the device may need to be re-interviewed to discover new endpoints.')
        );

        // Raw output configuration for advanced users
        exposesList.push(
            e.text('output_configuration', ea.SET)
                .withDescription('Raw output configuration as hex string (advanced). See ubisys LD6 technical reference for format.')
        );

        // Read-only output configuration info
        exposesList.push(
            e.text('output_configuration_raw', ea.STATE)
                .withDescription('Current raw output configuration as hex string')
        );
        exposesList.push(
            e.text('output_mode_description', ea.STATE)
                .withDescription('Description of the current output mode')
        );

        // Advanced Options
        exposesList.push(e.binary('advanced_options_no_color_white', ea.ALL, true, false).withDescription('Don’t use color for white tones'));
        exposesList.push(e.binary('advanced_options_no_first_white_color', ea.ALL, true, false).withDescription('Don’t use first white for color'));
        exposesList.push(e.binary('advanced_options_no_second_white_color', ea.ALL, true, false).withDescription('Don’t use second white for color'));

        // Ballast Configuration
        exposesList.push(e.numeric('ballast_min_level', ea.ALL).withValueMin(1).withValueMax(254).withDescription('Minimum light level'));
        exposesList.push(e.numeric('ballast_max_level', ea.ALL).withValueMin(1).withValueMax(254).withDescription('Maximum light level'));

        // Calibration Helper
        exposesList.push(e.text('calibration', ea.SET).withDescription('Calibration helper JSON: {"channel": 1..6, "x": 0..1, "y": 0..1, "flux": 0..254}'));
        exposesList.push(e.text('calibration_status', ea.STATE).withDescription('Status of the last calibration attempt'));

        // Zigbee Direct
        exposesList.push(e.enum('zigbee_direct_interface', ea.ALL, ['enabled', 'disabled']).withDescription('Zigbee Direct (Bluetooth) interface status'));
        exposesList.push(e.numeric('zigbee_direct_anonymous_join_timeout', ea.ALL).withValueMin(0).withValueMax(16777215).withUnit('s').withDescription('Anonymous join timeout'));

        return exposesList;
    },
    meta: {
        multiEndpoint: true,
        multiEndpointSkip: ['state', 'brightness', 'color_temp', 'color_xy', 'color_hs'],
    },
    endpoint: (device) => {
        // Map endpoint names to endpoint numbers
        // Light endpoints: l1=1, l2=5, l3=6, l4=7, l5=8, l6=9
        // Switch endpoints: s1=2, s2=3, s3=4
        return {
            l1: 1,
            l2: 5,
            l3: 6,
            l4: 7,
            l5: 8,
            l6: 9,
            s1: 2,
            s2: 3,
            s3: 4,
            default: 1,
        };
    },
    extend: [
        // Add the custom device setup cluster
        addCustomClusterLD6DeviceSetup(),
        // Add advanced color control options
        addCustomClusterLD6ColorControl(),
        // Add manufacturer specific level control options
        addCustomClusterLD6LevelCtrl(),
        // Add Zigbee Direct configuration
        addCustomClusterLD6ZigbeeDirect(),
    ],
    configure: async (device, coordinatorEndpoint, definition) => {
        // Run standard configure for lights if possible
        if (lightSettings.configure) {
            for (const func of lightSettings.configure) {
                await func(device, coordinatorEndpoint, definition);
            }
        }

        // Bind the main light endpoint for reporting
        const endpoint1 = device.getEndpoint(1);
        if (endpoint1) {
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);
            await reporting.onOff(endpoint1);
            await reporting.brightness(endpoint1);
            try {
                await reporting.colorTemperature(endpoint1);
                await reporting.colorXY(endpoint1);
            } catch (e) {
                // Color may not be supported
            }
            try {
                await endpoint1.read('genLevelCtrl', ['onOffTransitionTime', 'onLevel', 'startUpLevel', 'minimumOnLevel'], { manufacturerCode: 0x10f2 });
            } catch (e) {
                // Levels may not be supported
            }
            try {
                await endpoint1.read('genOnOff', ['startUpOnOff']);
            } catch (e) {
                // Startup on/off may not be supported
            }
            try {
                await endpoint1.read('lightingColorCtrl', ['startUpColorTemperatureMireds']);
            } catch (e) {
                // Startup color temperature may not be supported
            }
        }
        try {
            const endpoint232 = device.getEndpoint(232);
            await endpoint232.read('zigbeeDirectConfig', ['interfaceState', 'anonymousJoinTimeout']);
        } catch (e) {
            // Zigbee Direct may not be supported
        }

        // Read the current output configuration
        const endpoint232 = device.getEndpoint(232);
        if (endpoint232) {
            try {
                await endpoint232.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations'], {});
            } catch (e) {
                // May fail on first configure
            }
        }

        // Set up bindings for local control (input endpoints to output endpoint)
        const endpoint2 = device.getEndpoint(2);
        if (endpoint2 && endpoint1) {
            try {
                endpoint2.addBinding('genOnOff', endpoint1);
                endpoint2.addBinding('genLevelCtrl', endpoint1);
            } catch (e) {
                // May already be bound
            }
        }
    },
    ota: true,
};


export default definition;
