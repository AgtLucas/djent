import React, { Component } from 'react';

import InputBox from './InputBox';
import presets from '../utils/presets';

class PresetController extends Component {
    shouldComponentUpdate = (nextProps) => nextProps.activePresetID !== this.props.activePresetID;

    onChange = (event) => {
        const presetID = event.target.value;
        this.props.actions.applyPreset(presets.find(preset => preset.id === presetID));
    }

    render = () => {
        const presetItems = presets
            .map((preset, i) => (
                <option value={preset.id} key={i}>{ preset.description || preset.id }</option>
            ))

        return (
            <div className="input-container">
                <select className="input-base input-base--dropdown" onChange={(e) => this.onChange(e)} value={this.props.activePresetID}>
                    { presetItems }
                </select>
                <div className="input-dropdown-icon"></div>
            </div>
        );
    }
}

export default PresetController;
