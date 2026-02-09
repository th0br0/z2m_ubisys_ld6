/**
 * Zigbee2MQTT External Converter for ubisys C4 Control Unit
 */

import * as m from 'zigbee-herdsman-converters/lib/modernExtend';
import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import { Zcl } from 'zigbee-herdsman';
import { Buffer } from 'buffer';

const e = exposes.presets || (exposes.default && exposes.default.presets) || exposes;
const ea = exposes.access || (exposes.default && exposes.default.access);

const UBISYS_MANUFACTURER_CODE = Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH;

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
 * @param {number} attrId - Attribute ID (e.g., 0x0000 for inputConfigurations)
 * @param {Array} elements - Array of data
 * @param {number} elementType - Zcl.DataType of elements
 */
async function writeSetupAttribute(device, attrId, elements, elementType) {
    const endpoint = getSetupEndpoint(device);
    await endpoint.writeStructured('manuSpecificUbisysDeviceSetup', [{
        attrId, selector: {}, dataType: Zcl.DataType.ARRAY,
        elementData: { elementType, elements }
    }]);
}

const definition = {
    zigbeeModel: ['C4 (5504)', 'C4'],
    model: 'C4',
    vendor: 'ubisys',
    description: 'Zigbee 4-channel control unit',
    endpoint: (device) => {
        return {
            s1: 1, s2: 2, s3: 3, s4: 4,
            w1: 5, w2: 6, setup: 232,
        };
    },
    meta: {
        multiEndpoint: true,
    },
    extend: [
        m.deviceAddCustomCluster('manuSpecificUbisysDeviceSetup', {
            ID: 0xfc00,
            attributes: {
                inputConfigurations: { ID: 0x0000, type: Zcl.DataType.ARRAY, write: true },
                inputActions: { ID: 0x0001, type: Zcl.DataType.ARRAY, write: true },
            },
            commands: {}, commandsResponse: {},
        }),
        ...['s1', 's2', 's3', 's4'].map(ep => m.commandsOnOff({ endpointName: ep })),
        ...['s1', 's2', 's3', 's4'].map(ep => m.commandsLevelCtrl({ endpointName: ep })),
        ...['w1', 'w2'].map(ep => m.commandsWindowCovering({ endpointName: ep })),
        m.greenPower(),
        m.ota(),
    ],
    fromZigbee: [
        {
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
        },
    ],
    toZigbee: [
        {
            key: ['input_configurations'],
            convertSet: async (entity, key, value, meta) => {
                // Technical reference says UINT8 (0x08) elements
                const data = value.map(val => Buffer.from([val]));
                await writeSetupAttribute(meta.device, 0x0000, data, 0x08); // 0x08 = UINT8
                return { state: { input_configurations: value } };
            },
            convertGet: async (entity, key, meta) => {
                await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputConfigurations']);
            },
        },
        {
            key: ['input_actions'],
            convertSet: async (entity, key, value, meta) => {
                // Technical reference says OCTET_STR (0x41) elements
                const data = value.map(val => Buffer.from(val, 'hex'));
                await writeSetupAttribute(meta.device, 0x0001, data, 0x41); // 0x41 = OCTET_STR
                return { state: { input_actions: value } };
            },
            convertGet: async (entity, key, meta) => {
                await getSetupEndpoint(meta.device).read('manuSpecificUbisysDeviceSetup', ['inputActions']);
            },
        },
    ],
    exposes: [
        e.list('input_configurations', ea.ALL, e.numeric('value', ea.ALL))
            .withDescription('Input configurations: bit 7: disable, bit 6: invert (NC). Example: [0, 0, 0, 0]'),
        e.list('input_actions', ea.ALL, e.text('value', ea.ALL))
            .withDescription('Input actions: raw hex strings mapping inputs to clusters and commands.'),
    ],
    configure: async (device, coordinatorEndpoint, definition) => {
        const setupEp = device.getEndpoint(232);
        if (setupEp) {
            try {
                await setupEp.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations', 'inputActions']);
            } catch (e) {
                console.warn(`ubisys C4: Failed to read setup attributes: ${e.message}`);
            }
        }
    },
};

export default definition;
