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

const tzOutputConfiguration = {
    key: ['output_mode'],
    convertSet: async (entity, key, value, meta) => {
        const config = OUTPUT_CONFIGURATIONS[value];
        if (!config) throw new Error(`Unknown mode: ${value}`);
        const endpoint = meta.device.getEndpoint(232);
        await endpoint.writeStructured('manuSpecificUbisysDeviceSetup', [{
            attrId: 0x0010, selector: {}, dataType: Zcl.DataType.ARRAY,
            elementData: { elementType: Zcl.DataType.OCTET_STR, elements: config.data }
        }]);
        return { state: { output_mode: value } };
    },
};

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
                outputConfigurations: { ID: 0x0010, type: Zcl.DataType.ARRAY, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        m.deviceAddCustomCluster('lightingColorCtrl', {
            ID: Zcl.Clusters.lightingColorCtrl.ID,
            attributes: {
                advancedOptions: { ID: 0x0000, type: Zcl.DataType.UINT8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        m.deviceAddCustomCluster('genLevelCtrl', {
            ID: Zcl.Clusters.genLevelCtrl.ID,
            attributes: {
                minimumOnLevel: { ID: 0x0000, type: Zcl.DataType.UINT8, manufacturerCode: UBISYS_MANUFACTURER_CODE, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        {
            fromZigbee: [
                fzOutputConfiguration,
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
                            };
                        }
                    },
                },
                {
                    cluster: 'genLevelCtrl',
                    type: ['attributeReport', 'readResponse'],
                    convert: (model, msg, publish, options, meta) => {
                        if (msg.data.minimumOnLevel !== undefined) return { minimum_on_level: msg.data.minimumOnLevel };
                    },
                }
            ],
            toZigbee: [
                tzOutputConfiguration,
                {
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
                },
                {
                    key: ['minimum_on_level'],
                    convertSet: async (entity, key, value, meta) => {
                        await entity.write('genLevelCtrl', { minimumOnLevel: value }, { manufacturerCode: UBISYS_MANUFACTURER_CODE });
                        return { state: { minimum_on_level: value } };
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

                        const setupEp = meta.device.getEndpoint(232);
                        if (!setupEp) {
                            throw new Error('Device setup endpoint (232) not found');
                        }

                        const resp = await setupEp.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']);
                        if (!resp || !resp.outputConfigurations) {
                            throw new Error('Could not read current output configurations from device');
                        }

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

                        await setupEp.writeStructured('manuSpecificUbisysDeviceSetup', [{
                            attrId: 0x0010, selector: {}, dataType: Zcl.DataType.ARRAY,
                            elementData: { elementType: Zcl.DataType.OCTET_STR, elements }
                        }]);

                        return { state: { calibration_status: `Updated channel ${cal.channel}` } };
                    },
                }
            ],
            isModernExtend: true,
        }
    ],
    exposes: (device, options) => {
        const exposesList = [];
        exposesList.push(e.enum('output_mode', ea.SET, Object.keys(OUTPUT_CONFIGURATIONS)));
        exposesList.push(e.text('output_configuration_raw', ea.STATE));
        exposesList.push(e.binary('advanced_options_no_color_white', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_no_first_white_color', ea.ALL, true, false));
        exposesList.push(e.binary('advanced_options_no_second_white_color', ea.ALL, true, false));
        exposesList.push(e.numeric('minimum_on_level', ea.ALL).withValueMin(1).withValueMax(254));
        exposesList.push(e.text('calibration', ea.SET));
        exposesList.push(e.text('calibration_status', ea.STATE));

        if (device && typeof device.getEndpoint === 'function') {
            [1, 5, 6, 7, 8, 9].forEach(epNum => {
                const ep = device.getEndpoint(epNum);
                if (ep) {
                    const name = epNum === 1 ? 'l1' : `l${epNum === 5 ? 2 : epNum - 3}`;
                    const hasColor = ep.supportsInputCluster('lightingColorCtrl');
                    const hasLevel = ep.supportsInputCluster('genLevelCtrl');
                    if (hasColor) {
                        exposesList.push(e.light_brightness_colortemp_colorxy([153, 555]).withEndpoint(name));
                    } else if (hasLevel) {
                        exposesList.push(e.light_brightness().withEndpoint(name));
                    }
                }
            });
        }
        return exposesList;
    },
    configure: async (device, coordinatorEndpoint, definition) => {
        const setupEp = device.getEndpoint(232);
        if (setupEp) {
            try { await setupEp.read('manuSpecificUbisysDeviceSetup', ['outputConfigurations']); } catch (e) { }
        }
    },
    ota: true,
};

export default definition;
