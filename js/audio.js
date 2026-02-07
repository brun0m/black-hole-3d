export function initSpaceAudio() {
    // Variável para evitar recriar o contexto
    if (window.isAudioStarted) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    const createDrone = (freq, type, vol) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = 0.05; 
        lfoGain.gain.value = 2.0;   
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
    };

    createDrone(55.0, 'sine', 0.15); 
    createDrone(58.0, 'triangle', 0.05);
    createDrone(220.0, 'sine', 0.02);

    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400; 
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start();

    window.isAudioStarted = true;
    console.log("Áudio espacial iniciado.");
}