import React, { Component } from 'react';

import {
    playSound
} from '../utils/audio';

import {
    convertAllowedLengthsToArray,
    generateSequence,
    getSequenceForInstrument,
} from '../utils/sequences';

import {
    generateRiff,
} from '../utils/riffs';

import {
    capitalize,
    compose,
} from '../utils/tools';

import SVG from './SVG';
import Waveform from './Waveform';

const getSequences = (grooveTotalBeats, allowedLengths, hitChance) => {
    const mainBeat       = generateSequence({ totalBeats: grooveTotalBeats, allowedLengths, hitChance });
    const cymbalSequence = getSequenceForInstrument('cymbal');
    const hihatSequence  = getSequenceForInstrument('hihat');
    const snareSequence  = getSequenceForInstrument('snare');
    const droneSequence  = getSequenceForInstrument('drone');

    const sequences     = {
        c : cymbalSequence,
        h : hihatSequence,
        k : mainBeat,
        g : mainBeat,
        s : snareSequence,
        d : droneSequence,
    };

    return sequences;
}

const generateNewBuffer = ({ bpm, beats, allowedLengths, hitChance, instruments }) => {
    if (!allowedLengths.filter(length => length.amount).length) return Promise.resolve(false);

    const totalBeats              = beats.find(beat => beat.id === 'total');
    const grooveTotalBeats        = beats.find(beat => beat.id === 'groove');
    const grooveTotalBeatsProduct = grooveTotalBeats.beats * grooveTotalBeats.bars;
    const totalBeatsProduct       = totalBeats.beats * totalBeats.bars;
    const sequences               = getSequences(grooveTotalBeatsProduct, convertAllowedLengthsToArray(allowedLengths), hitChance);

    return generateRiff({ bpm, totalBeatsProduct,  allowedLengths, sequences, instruments })
}

const context          = new AudioContext();
const loop             = (src, isLooping) => { if (src) { src.loop = isLooping } };
const stop             = (src) => { if (src) { src.onended = () => {}; src.stop(); } };
const play             = (buffer) => playSound(context, buffer, context.currentTime, buffer.duration, 1, true);
const playBuffer = (buffer) => {
    if(!buffer) return;
    let nextBuffer;
    const newSrc = play(buffer);

    return newSrc;
}
const fadeIn = (gainNode, duration) => {
    if (!duration) return gainNode
    const startVal = -1;
    const endVal = 0;
    gainNode.gain.value = startVal;

    let startTime = 0;
    (function loop (t) {
        if (!startTime) startTime = t;
        const time = t - startTime;
        const speed = duration === 0 ? 0 : time / duration;

        gainNode.gain.value = startVal + speed
        if (gainNode.gain.value < endVal) requestAnimationFrame(loop);
        else gainNode.gain.value = endVal;
    })(0.00);

    return gainNode;
}

class SoundController extends Component {
    currentBuffer;
    currentSrc;
    currentGainNode;
    state = {
        isPlaying  : false,
        isLoading  : false,
        error      : '',
    }

    updateUI = (newState) => {
        requestAnimationFrame(() => this.setState(newState));
    }

    componentWillUpdate = (nextProps) => {
        if(nextProps.isLooping !== this.props.isLooping) {
            loop(this.currentSrc, nextProps.isLooping);
        }
    }

    generate = (shouldPlay) => {
        this.stopEvent(this.currentSrc);
        generateNewBuffer(this.props)
            .then(({ buffer, instruments }) => {
                console.log('BUFFER, INSTRUMENTS', buffer, instruments)
                const newState = { isLoading: false, error: '' };

                if (!buffer) newState.error = 'Error!'
                this.currentBuffer = buffer;
                if (shouldPlay) this.playEvent();
                this.props.actions.updateCustomPresetInstruments(instruments);
                this.updateUI(newState);
            });

        this.updateUI({ isLoading: true });
    }

    togglePlay = () => {
        if (this.state.isPlaying) {
            this.stopEvent();
        } else {
            this.playEvent();
        }
    }

    playEvent = () => {
        if (!this.currentBuffer || this.state.error) return;
        this.currentGainNode = context.createGain();

        stop(this.currentSrc);
        this.currentSrc = playBuffer(this.currentBuffer);

        // Set up volume and fades
        this.currentSrc.connect(this.currentGainNode);
        this.currentGainNode.gain.value = 0;
        this.currentGainNode.connect(context.destination);
        this.currentGainNode = fadeIn(this.currentGainNode, (this.props.fadeIn ? 5000 : 0));

        loop(this.currentSrc, this.props.isLooping);
        this.updateUI({ isPlaying: true });

        this.currentSrc.addEventListener('ended', this.onEnded)
    }

    onEnded = () => {
        if (this.props.continuousGeneration) this.generate(true);
        else this.stopEvent();
    }

    stopEvent = () => {
        if (this.currentSrc) this.currentSrc.removeEventListener('ended', this.onEnded)
        stop(this.currentSrc)
        this.updateUI({ isPlaying: false });
    }

    generateEvent = () => {
        if (!this.state.isLoading) this.generate(true);
    }

    render () {
        const eventName = this.state.isPlaying ? 'stop' : 'play';


        return (
            <div>
                { this.state.error ? <p className="txt-error">{ this.state.error }</p> : null }
                <ul className="list-hor list-hor--tight">
                    <li className="list-hor__item">
                        <button className="button-primary button-primary--positive" onClick={() => this.generateEvent()}>
                            { this.currentBuffer ? 'Regenerate' : 'Generate' }
                        </button>
                    </li>

                    <li className="list-hor__item">
                        <button className="button-primary" title={ capitalize(eventName) } onClick={this.togglePlay} disabled={!this.currentBuffer}>
                            {
                                this.state.isLoading
                                ? <span className="spinner" />
                                : <SVG icon={ eventName } className="button-primary__svg-icon" />
                            }
                        </button>
                    </li>
                </ul>
            </div>
        );
    }
}

export default SoundController;
