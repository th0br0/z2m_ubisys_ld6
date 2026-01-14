# ubisys LD6 Zigbee2MQTT External Converter

This was vibecoded with Antigravity. It works for me (I only use the CCT mode though), YMMV. :) 

This external converter provides support for the **ubisys LD6** Zigbee/Bluetooth LED Controller with 6 configurable outputs.

## Features

- Full independent control for up to 6 lights (depending on mode)
- On/Off, Brightness, Color Temperature (CCT), and Color (xy/hs)
- **Dynamic UI**: Features like Color X/Y or Color Temperature are automatically shown/hidden based on the device's current cluster configuration.
- **Output configuration mode selection** - Choose from 15+ predefined modes
- **Advanced color mixing options** - Fine-tune how white and color LEDs interact
- **Dimming limits** - Set minimum and maximum brightness levels (ballast config)
- **Input configuration** - Enable/disable or invert the 3 physical inputs
- OTA firmware updates

## Installation

1. Copy `ubisys_ld6.mjs` to your Zigbee2MQTT external converters folder:
   ```
   <zigbee2mqtt_data>/external_converters/ubisys_ld6.mjs
   ```

2. Restart Zigbee2MQTT

3. Pair the LD6 device (or if already paired, it should be recognized automatically)

## Output Configuration Modes

The LD6 has 6 PWM output channels that can be configured in various ways:

### Single Light Configurations

| Mode | Description | Channels Used |
|------|-------------|---------------|
| `1x_dimmable` | 1x Dimmable (mono) | 1 |
| `1x_cct` | 1x CCT / Tunable White (Cool/Warm) | 2 |
| `1x_rgb` | 1x RGB Color | 3 |
| `1x_rgbw` | 1x RGBW (RGB + neutral White) | 4 |
| `1x_rgbww` | 1x RGBWW (RGB + Cool/Warm White) | 5 |
| `1x_extended_gamut` | 1x Extended Color (R/A/G/T/B/V) | 6 |

### Two Light Configurations

| Mode | Description | Endpoints |
|------|-------------|-----------|
| `2x_dimmable` | 2x Dimmable (mono) | EP1, EP5 |
| `2x_cct` | 2x CCT / Tunable White | EP1, EP5 |
| `1x_rgb_1x_cct` | 1x RGB + 1x CCT | EP1, EP5 |
| `1x_cct_1x_rgb` | 1x CCT + 1x RGB | EP1, EP5 |
| `1x_rgbw_1x_cct` | 1x RGBW + 1x CCT | EP1, EP5 |
| `2x_rgb` | 2x RGB Color | EP1, EP5 |

### Three+ Light Configurations

| Mode | Description | Endpoints |
|------|-------------|-----------|
| `3x_dimmable` | 3x Dimmable (mono) | EP1, EP5, EP6 |
| `3x_cct` | 3x CCT / Tunable White | EP1, EP5, EP6 |
| `4x_dimmable` | 4x Dimmable (mono) | EP1, EP5, EP6, EP7 |
| `5x_dimmable` | 5x Dimmable (mono) | EP1, EP5, EP6, EP7, EP8 |
| `6x_dimmable` | 6x Dimmable (mono) | EP1, EP5, EP6, EP7, EP8, EP9 |

## Changing Output Configuration

### Via MQTT

```bash
# Set to 3x CCT mode
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"output_mode": "3x_cct"}'

# Set to 1x RGBWW mode
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"output_mode": "1x_rgbww"}'
```

### Via Home Assistant

Use the `output_mode` select entity to choose the desired configuration.

### Important Notes

1. **Re-interview after changing mode**: When you change the output configuration, the device dynamically reconfigures its endpoints. You may need to re-interview the device in Zigbee2MQTT to discover the new endpoints.

2. **Wait for reconfiguration**: The device takes a few seconds to reconfigure after changing modes. A 3-second delay is built into the converter.

3. **Endpoint mapping**:
   - Light 1 = Endpoint 1 (`l1`)
   - Light 2 = Endpoint 5 (`l2`)
   - Light 3 = Endpoint 6 (`l3`)
   - Light 4 = Endpoint 7 (`l4`)
   - Light 5 = Endpoint 8 (`l5`)
   - Light 6 = Endpoint 9 (`l6`)

## Input Configuration

The LD6 has 3 physical inputs (endpoints 2, 3, 4) that can be configured for various functions like:
- On/Off toggle
- Dimming
- Color temperature control
- Scene recall

### Reading Current Input Configuration

```bash
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/get' -m '{"input_configurations": ""}'
```

### Setting Input Configuration

```bash
# Set all 3 inputs to enabled (0x00)
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"input_configurations": [0, 0, 0]}'

# Set input 1 to inverted (normally closed)
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"input_configurations": [64, 0, 0]}'

# Disable input 2
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"input_configurations": [0, 128, 0]}'
```

Input configuration values:
- `0x00` (0) = Enabled, active-high
- `0x40` (64) = Enabled, inverted (active-low, for normally closed switches)
- `0x80` (128) = Disabled

## Advanced Color Mixing (`AdvancedOptions`)

The LD6 allows fine-tuning of how color and white primaries are mixed. These are exposed as binary switches:

- **Don't use color for white**: White tones in CCT mode will only be composed of white LEDs (requires 2 white primaries).
- **Don't use first/second white for color**: Prevents specific white LEDs from contributing to colored light ( CIE 1931 xy or hue/saturation mode).
- **Constant Luminous Flux**: Maintains constant brightness when shifting color temperature.
- **Ignore Color Temperature Range**: Allows setting any color temperature even if it falls outside the calibrated physical range.

## Dimming Limits (`Ballast Configuration`)

Set hard limits for brightness to prevent flickering at low levels or save energy:

- `ballast_min_level`: Minimum brightness (1-254)
- `ballast_max_level`: Maximum brightness (1-254)

## Transitions and Defaults

Each light endpoint (`l1`-`l6`) has dedicated transition and level settings:

- **`on_off_transition_time`**: The time (in 0.1s units) to fade from off to on, and vice-versa. Set to `0` for instant switching.
- **`on_level`**: The brightness level (1-254) the light should turn on at. Set to `previous` (255) to remember the last level.
- **`startup_level`**: The brightness level applied after a power cycle. Set to `previous` or `keep` (254) for special behaviors.
- **`startup_on_off`**: The on/off state after a power cycle. Options: `on`, `off`, `toggle`, `previous`.
- **`startup_color_temperature`**: The color temperature (in mireds) applied after a power cycle.
- **`minimum_on_level`**: The minimum brightness level (1-254) when the light is turned on.

## Zigbee Direct (Bluetooth Low Energy)

The LD6 supports Zigbee Direct, allowing for secure provisioning and control via Bluetooth.

- **`zigbee_direct_interface`**: Enable or disable the Bluetooth interface.
- **`zigbee_direct_anonymous_join_timeout`**: The period (in seconds) after power-up during which a device can join anonymously via Bluetooth.

## Advanced: Color Calibration Helper

Instead of manually building hex strings for `output_configuration`, use the `calibration` entity with a JSON payload:

```json
{
  "channel": 1,
  "x": 0.3127,
  "y": 0.3290,
  "flux": 254
}
```

- **`channel`**: 1 to 6 (physical PWM outputs).
- **`x` / `y`**: CIE 1931 chromaticity coordinates (0.0 to 1.0).
- **`flux`**: Relative luminous flux (0 to 254).

### Fixing CCT Range Mismatch

If your CCT slider goes from 153 to 555 Mireds (6500K-1800K) but your light stops changing color at 370 Mireds (2700K), it means the device is configured for a wider range than your physical LED strips support.

To fix this, use the **calibration** helper to tell the LD6 the exact color specifications of your strips.

**Example for a standard 2700K (Warm) + 6500K (Cool) strip:**

1.  **Set Cool Channel (e.g. Channel 1) to 6500K:**
    `{"channel": 1, "x": 0.3127, "y": 0.3290}`
2.  **Set Warm Channel (e.g. Channel 2) to 2700K:**
    `{"channel": 2, "x": 0.4578, "y": 0.4101}`

After applying these, **Re-Interview** the device. The reported `color_temp` range will automatically adjust to 153-370 Mireds.

## Advanced: Raw Output Configuration

For custom configurations not covered by the predefined modes, you can write raw configuration data:

```bash
mosquitto_pub -t 'zigbee2mqtt/YOUR_LD6_NAME/set' -m '{"output_configuration": "484106001006ffffffffffffffff..."}'
```

See the ubisys LD6 Technical Reference Manual for the full configuration format.

## Exposed Entities

| Entity | Access | Description |
|--------|--------|-------------|
| `light_l1` | Read/Write | Primary light control |
| `light_l2` - `light_l6` | Read/Write | Additional lights (when configured) |
| `on_off_transition_time` | Read/Write | Fade time for each light (per-endpoint) |
| `on_level` | Read/Write | Default ON brightness (per-endpoint) |
| `startup_level` | Read/Write | Level after reboot (per-endpoint) |
| `startup_on_off` | Read/Write | On/Off state after reboot (per-endpoint) |
| `startup_color_temperature` | Read/Write | Color temperature after reboot (per-endpoint) |
| `minimum_on_level` | Read/Write | Minimum level when turning ON (per-endpoint) |
| `output_mode` | Read/Write | Select output configuration mode |
| `output_mode_description` | Read | Description of current mode |
| `output_configuration_raw` | Read | Raw configuration as hex |
| `output_configuration` | Write | Write raw configuration |
| `calibration` | Write | Calibration helper (see format above) |
| `calibration_status` | Read | Result of last calibration command |
| `zigbee_direct_interface` | Read/Write | Bluetooth interface status |
| `zigbee_direct_anonymous_join_timeout` | Read/Write | Bluetooth join timeout |
| `input_configurations` | Read/Write | Input enable/invert settings |
| `input_actions` | Read/Write | Input action mappings |
| `advanced_options_no_color_white` | Read/Write | Don't use color for white tones |
| `advanced_options_no_first_white_color` | Read/Write | Don't use first white for color |
| `advanced_options_no_second_white_color` | Read/Write | Don't use second white for color |
| `advanced_options_ignore_color_temp_range` | Read/Write | Ignore CCT limits |
| `advanced_options_constant_luminous_flux` | Read/Write | Constant brightness across CCT |
| `ballast_min_level` | Read/Write | Minimum light level (1-254) |
| `ballast_max_level` | Read/Write | Maximum light level (1-254) |

## Troubleshooting

### Endpoints not appearing after mode change

1. Go to Zigbee2MQTT → Devices → Your LD6
2. Click "Reconfigure" or "Interview" to rediscover endpoints
3. Restart Home Assistant if entities don't appear

### Light colors not accurate

The predefined CIE xy coordinates are defaults from the ubisys documentation. For accurate color reproduction with specific LED strips, you may need to use the raw output configuration with your LED's actual chromaticity values (available from the LED datasheet or a spectrometer test).

### Device not responding

1. Check the device is online in Zigbee2MQTT
2. Try a simple command: `{"state": "ON"}`
3. Power cycle the LD6 if needed

## References

- [ubisys LD6 Technical Reference](https://www.ubisys.de/en/support/technical-documentation/)
- [Zigbee2MQTT External Converters](https://www.zigbee2mqtt.io/advanced/more/external_converters.html)

## License

This converter is provided as-is for the community. Contributions welcome!
