import React, { Component } from 'react';
import deepEqual from 'deep-equal';

import {
    playSound,
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
    deepClone,
} from '../utils/tools';

import SVG from './SVG';
import Waveform from './Waveform';
import LoopController from './LoopController';

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

const generateNewBuffer = ({ bpm, beats, allowedLengths, hitChance, instruments, usePredefinedSettings }) => {
    if (!allowedLengths.filter(length => length.amount).length) return Promise.reject('There are no allowed lengths given');

    const totalBeats              = beats.find(beat => beat.id === 'total');
    const grooveTotalBeats        = beats.find(beat => beat.id === 'groove');
    const grooveTotalBeatsProduct = grooveTotalBeats.beats * grooveTotalBeats.bars;
    const totalBeatsProduct       = totalBeats.beats * totalBeats.bars;
    const sequences               = getSequences(grooveTotalBeatsProduct, convertAllowedLengthsToArray(allowedLengths), hitChance);

    return generateRiff({ bpm, totalBeatsProduct, allowedLengths, sequences, instruments, usePredefinedSettings })
}

const loop             = (src, isLooping) => { if (src) { src.loop = isLooping } };
const stop             = (src) => { if (src) { src.onended = () => {}; src.stop(0); } };
const play             = (audioContext, buffer) => playSound(audioContext, buffer, audioContext.currentTime, buffer.duration, 1, true);

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
    currentGainNode;
    audioContext = '';
    isOutDated = true;
    state = {
        isLoading  : false,
        error      : '',
    }

    updateUI = (newState) => {
        requestAnimationFrame(() => this.setState(newState));
    }

    componentWillUpdate = (nextProps, nextState) => {
        if (nextProps.isLooping !== this.props.isLooping) loop(this.props.currentSrc, nextProps.isLooping);
        if (typeof this.props.generationState === "undefined") return;

        // Check against the generation state to see if we're out of date
        if (   nextProps.bpm !== this.props.generationState.bpm
            || nextProps.hitChance !== this.props.generationState.hitChance
            || !deepEqual(nextProps.beats, this.props.generationState.beats)
            || !deepEqual(nextProps.allowedLengths, this.props.generationState.allowedLengths)
            || nextProps.instruments
                .filter((instrument, i) =>
                    !deepEqual(instrument.sounds, this.props.generationState.instruments[i].sounds)
                ).length
        ) {
            this.isOutDated = true;
        } else {
            this.isOutDated = false;
        }
    }

    generate = (shouldPlay) => {
        if (this.audioContext) this.audioContext.close();
        this.audioContext = new AudioContext();
        this.stopEvent(this.props.currentSrc);

        const { bpm, beats, allowedLengths, hitChance, instruments, usePredefinedSettings } = this.props;
        const generationState = deepClone({ bpm, beats, allowedLengths, hitChance, instruments, usePredefinedSettings });

        this.props.actions.updateGenerationState(generationState);

        generateNewBuffer({ ...generationState, instruments })
            .then(({ buffer, instruments }) => {
                const newState = { isLoading: false, error: '' };

                if (!buffer) newState.error = 'Error!'
                this.props.actions.updateCurrentBuffer(buffer);
                if (shouldPlay) this.playEvent();
                this.props.actions.updateCustomPresetInstruments(instruments);
                this.updateUI(newState);
            });

        this.isOutDated = false;
        this.updateUI({ isLoading: true });
    }

    togglePlay = () => {
        if (this.props.isPlaying) {
            this.stopEvent();
        } else {
            this.playEvent();
        }
    }

    playEvent = () => {
        if (!this.props.currentBuffer || this.state.error) return;
        console.log('THIS.CONTEXT1', this.audioContext)
        this.currentGainNode = this.audioContext.createGain();

        stop(this.props.currentSrc);
        this.props.actions.updateCurrentSrc(this.props.currentBuffer ? play(this.audioContext, this.props.currentBuffer) : null);
        console.log('THIS.CONTEXT2', this.audioContext)

        // Set up volume and fades
        this.props.currentSrc.connect(this.currentGainNode);
        this.currentGainNode.gain.value = 0;
        this.currentGainNode.connect(this.audioContext.destination);
        this.currentGainNode = fadeIn(this.currentGainNode, (this.props.fadeIn ? 5000 : 0));

        loop(this.props.currentSrc, this.props.isLooping);
        this.props.actions.updateIsPlaying(true);

        this.props.currentSrc.addEventListener('ended', this.onEnded)
        console.log('THIS.CONTEXT3', this.audioContext)
    }

    onEnded = () => {
        if (this.props.continuousGeneration) this.generate(true);
        else this.stopEvent();
    }

    stopEvent = () => {
        if (this.props.currentSrc) this.props.currentSrc.removeEventListener('ended', this.onEnded)
        stop(this.props.currentSrc)
        this.props.actions.updateIsPlaying(false);
    }

    generateEvent = () => {
        if (!this.state.isLoading) this.generate(true);
    }

    render () {
        const eventName = this.props.isPlaying ? 'stop' : 'play';

        return (
            <div>
                { this.state.error ? <p className="txt-error">{ this.state.error }</p> : null }
                <div className="u-flex-row u-flex-wrap">
                    <div className="group-spacing-y-small u-mr05">
                        <button className={`button-primary ${ this.isOutDated ? 'button-primary--positive' : '' } u-flex-row ${ this.state.isLoading ? '' : 'icon-is-hidden' }`} onClick={() => this.generateEvent()}>
                            <span className="button-primary__inner">{ this.props.generateButtonText || 'Generate Riff' }</span>
                            <span className="button-primary__icon">
                                <span className="spinner" />
                            </span>
                        </button>
                    </div>

                    <div className="group-spacing-y-small u-mr1">
                        <button className="button-primary" title={ capitalize(eventName) } onClick={this.togglePlay} disabled={!this.props.currentBuffer}>
                            <SVG icon={ eventName } className="button-primary__svg-icon" />
                        </button>
                    </div>

                    <div className="group-spacing-y-small u-mr1">
                        <LoopController
                            isLooping={this.props.isLooping}
                            actions={{
                                updateIsLooping: (newVal) => this.props.actions.updateIsLooping(newVal)
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default SoundController;
