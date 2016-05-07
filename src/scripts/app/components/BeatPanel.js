import React, { Component } from 'react';

import AllowedLengthsController from './AllowedLengthsController';
import BeatsController          from './BeatsController';
import HitChanceController      from './HitChanceController';

class BeatPanel extends Component {
    onHitChanceChange = (event) => {
        const hitChance = parseInt(event.target.value);
        this.props.beat.actions.updateHitChance(hitChance);
    }

    render = () => {
        return (
            <section className="beat-panel">
                <div className="group-padding-x group-padding-y">
                    <h2 className="title-secondary">{ this.props.beat.id }</h2>

                    <div className="beat-panel__section">
                        <AllowedLengthsController
                            actions={{ updateAllowedLengths: this.props.actions.updateAllowedLengths }}
                            allowedLengths={this.props.allowedLengths}
                        />
                    </div>

                    <div className="beat-panel__section">
                        <BeatsController
                            beat={ this.props.beat }
                            actions={{ updateBeats: this.props.actions.updateBeats }}
                        />
                    </div>

                    <div className="beat-panel__section">
                        <HitChanceController
                            beatID={ this.props.beat.id }
                            hitChance={ this.props.hitChance }
                            actions={{ updateHitChance: this.props.actions.updateHitChance }}
                        />
                    </div>
                </div>
            </section>
        );
    }
}

export default BeatPanel;
