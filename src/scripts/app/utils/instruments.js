import {
    loopSequence,
    generateTimeMap,
} from './sequences';

import {
    deepCloneObject,
    randFromTo,
    repeatArray,
} from './tools';

import { playSound } from './audio';

const getInstrumentsSequences = (instruments, sequences, totalBeats) => {
    return Object.keys(sequences)
        .map(instrumentId => {
            const instrument = instruments.find(i => i.id === instrumentId);
            const predefinedSequence = instrument.predefinedSequence;
            console.log('PREDEFINEDSEQUENCE', predefinedSequence)
            const newSequence = predefinedSequence || sequences[instrumentId];
            console.log('NEWSEQUENCE', newSequence)

            return {
                ...instrument,
                sequence: newSequence.map(seq => deepCloneObject(seq))
            }
        });
}

const generateInstrumentTimeMap = (instrument) => {
    const timeMap = generateTimeMap(instrument.sequence);

    return {
        ...instrument,
        timeMap
    }
}

const generateInstrumentHitTypes = (instrument) => {
    const predefinedHitTypes = instrument.predefinedHitTypes;
    console.log('PREDEFINEDHITTYPES', predefinedHitTypes)

    if (predefinedHitTypes && predefinedHitTypes.length) return {
        ...instrument,
        hitTypes: [ ...predefinedHitTypes ]
    }
    console.log('LOL', predefinedHitTypes)

    const activeSounds = instrument.sounds.reduce((newArr, sound, i) => sound.enabled ? [ ...newArr, { ...sound, index: newArr.length } ] : newArr, []);
    let hitTypes = [];

    if (activeSounds.length) {
        hitTypes = instrument.sequence.map((hit) => activeSounds[randFromTo(0, activeSounds.length-1)].index);
        console.log('HITTYPES', hitTypes)
    }

    return {
        ...instrument,
        hitTypes
    }
}

const renderInstrumentSoundsAtTempo = (instruments, totalBeats, bpmMultiplier) => {
    const timeLength = totalBeats * bpmMultiplier;
    const offlineCtx = new OfflineAudioContext(2, 44100 * timeLength, 44100);

    instruments.forEach((instrument) => {
        let startTimes = [];
        let durations  = [];
        const sources = instrument.timeMap.reduce((sources, time, i) => {
            console.log('INSTRUMENT', instrument, instrument.hitTypes[i])
            const instrumentSound = instrument.buffers[instrument.hitTypes[i]];
            const startTime       = offlineCtx.currentTime + (time * bpmMultiplier);
            const duration        = instrument.ringout ? instrumentSound.duration : (1 / instrument.sequence[i].beat) * bpmMultiplier;
            console.log('DURATION', duration)
            const source          = playSound(offlineCtx, instrumentSound, startTime, duration, instrument.sequence[i].volume, 0);

            startTimes[i] = startTime;
            durations[i]   = duration;

            return [ ...sources, source ];
        }, []);
    })
    return new Promise((res, rej) => {
        offlineCtx.oncomplete = ev => res(ev.renderedBuffer);
        offlineCtx.onerror    = ev => rej(ev.renderedBuffer);
        offlineCtx.startRendering();
    })
}

const repeatHits = instrument => {
    const hitTypes = repeatArray(instrument.hitTypes, instrument.sequence.length);

    return {
        ...instrument,
        hitTypes
    }
}

const repeatSequence = (instrument, beats) => {
    const sequence = loopSequence(instrument.sequence, beats);

    return {
        ...instrument,
        sequence
    }
}


export {
    getInstrumentsSequences,
    generateInstrumentTimeMap,
    generateInstrumentHitTypes,
    renderInstrumentSoundsAtTempo,
    repeatHits,
    repeatSequence,
}
