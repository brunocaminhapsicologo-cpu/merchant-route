export type WeaponSoundCategory =
  | "melee"
  | "pistol"
  | "revolver"
  | "shotgun"
  | "rifle"
  | "smg"
  | "sniper";

export type PropulsionSoundType = "human" | "animal" | "motor";

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class WastelandSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private effectsOutput: GainNode | null = null;
  private ambientOutput: GainNode | null = null;

  private effectsVolume = .7;
  private ambienceVolume = .25;
  private ambienceScene: "desert"|"town"|"combat" = "desert";
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private saturationCurve: Float32Array<ArrayBuffer> | null = null;
  private hoofToggle = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = window.localStorage.getItem("merchant_route_muted");
        if (savedMute === "true") {
          this.muted = true;
        }
      } catch {
        // Ignore storage errors in restricted environments
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("merchant_route_muted", String(this.muted));
      } catch {
        // Ignore storage errors
      }
    }
    if (this.muted && this.ctx && this.ctx.state === "running") {
      void this.ctx.suspend().catch(() => undefined);
    } else if (!this.muted && this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") {
      return null;
    }

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ??
        (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }

    return this.ctx;
  }

  private getEffectsOutput(ctx: AudioContext): GainNode {
    if(!this.effectsOutput){this.effectsOutput=ctx.createGain();this.effectsOutput.gain.value=this.effectsVolume;this.effectsOutput.connect(ctx.destination);}
    return this.effectsOutput;
  }

  public getVolumes(): {effects:number;ambience:number} {return {effects:this.effectsVolume,ambience:this.ambienceVolume};}
  public loadPreferences(): void {
    if(typeof window==="undefined")return;
    try {const pref=JSON.parse(window.localStorage.getItem("merchant_route_audio")??"{}");if(typeof pref.effects==="number")this.effectsVolume=Math.max(0,Math.min(1,pref.effects));if(typeof pref.ambience==="number")this.ambienceVolume=Math.max(0,Math.min(1,pref.ambience));}catch{/* Keep safe defaults. */}
  }
  public setVolumes(effects:number,ambience:number): void {
    this.effectsVolume=Math.max(0,Math.min(1,effects));this.ambienceVolume=Math.max(0,Math.min(1,ambience));
    if(this.effectsOutput)this.effectsOutput.gain.value=this.effectsVolume;
    if(this.ambientOutput)this.ambientOutput.gain.value=this.ambienceVolume*.25;
    try{window.localStorage.setItem("merchant_route_audio",JSON.stringify({effects:this.effectsVolume,ambience:this.ambienceVolume}));}catch{/* Sound still works without storage. */}
  }
  public unlockAudio(): void {const ctx=this.getContext();if(ctx){void ctx.resume().catch(()=>undefined);this.startAmbience(this.ambienceScene);}}
  public startAmbience(scene:"desert"|"town"|"combat"): void {
    this.ambienceScene=scene;
    const ctx=this.getContext();if(!ctx)return;
    if(!this.ambientOutput){
      const source=this.createNoiseSource(ctx,"pink");source.loop=true;
      const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=500;
      const gain=ctx.createGain();gain.gain.value=0;
      source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
      this.ambientOutput=gain;
    }
    this.ambientOutput.gain.setTargetAtTime(this.ambienceVolume*(scene==="combat"?.08:scene==="town"?.14:.25),ctx.currentTime,.5);
  }
  public pauseAudio(): void {if(this.ctx)void this.ctx.suspend().catch(()=>undefined);}

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (
      this.whiteNoiseBuffer &&
      this.whiteNoiseBuffer.sampleRate === ctx.sampleRate
    ) {
      return this.whiteNoiseBuffer;
    }
    const durationSeconds = 2.0;
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (
      this.pinkNoiseBuffer &&
      this.pinkNoiseBuffer.sampleRate === ctx.sampleRate
    ) {
      return this.pinkNoiseBuffer;
    }
    const durationSeconds = 2.0;
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.pinkNoiseBuffer = buffer;
    return buffer;
  }

  private getSaturationCurve(): Float32Array<ArrayBuffer> {
    if (this.saturationCurve) {
      return this.saturationCurve;
    }
    const samples = 1024;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    const deg = Math.PI / 180;
    const amount = 38;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] =
        ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    this.saturationCurve = curve;
    return curve;
  }

  private createNoiseSource(
    ctx: AudioContext,
    type: "white" | "pink" = "white"
  ): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer =
      type === "pink"
        ? this.getPinkNoiseBuffer(ctx)
        : this.getWhiteNoiseBuffer(ctx);
    return source;
  }

  private triggerSingleGunshot(
    ctx: AudioContext,
    startTime: number,
    config: {
      punchStartFreq: number;
      punchEndFreq: number;
      punchDuration: number;
      punchGain: number;
      crackFreq: number;
      crackQ: number;
      crackDuration: number;
      crackGain: number;
      bodyCutoff: number;
      bodyDuration: number;
      bodyGain: number;
      tailDuration: number;
      tailCutoff: number;
      tailGain: number;
      metallicFreq?: number;
    }
  ): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, startTime);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getSaturationCurve();
    shaper.oversample = "2x";

    master.connect(shaper);
    shaper.connect(this.getEffectsOutput(ctx));

    // 1. Low-end muzzle concussion / pitch-drop punch
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = "triangle";
    punchOsc.frequency.setValueAtTime(config.punchStartFreq, startTime);
    punchOsc.frequency.exponentialRampToValueAtTime(
      Math.max(20, config.punchEndFreq),
      startTime + config.punchDuration
    );
    punchGain.gain.setValueAtTime(config.punchGain, startTime);
    punchGain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + config.punchDuration
    );
    punchOsc.connect(punchGain);
    punchGain.connect(master);
    punchOsc.start(startTime);
    punchOsc.stop(startTime + config.punchDuration + 0.02);

    // 2. High-velocity ballistic snap / crack (bandpass white noise)
    const crackNoise = this.createNoiseSource(ctx, "white");
    const crackFilter = ctx.createBiquadFilter();
    const crackGain = ctx.createGain();
    crackFilter.type = "bandpass";
    crackFilter.frequency.setValueAtTime(config.crackFreq, startTime);
    crackFilter.frequency.exponentialRampToValueAtTime(
      Math.max(250, config.crackFreq * 0.45),
      startTime + config.crackDuration
    );
    crackFilter.Q.setValueAtTime(config.crackQ, startTime);

    crackGain.gain.setValueAtTime(0.001, startTime);
    crackGain.gain.linearRampToValueAtTime(
      config.crackGain,
      startTime + 0.003
    );
    crackGain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + config.crackDuration
    );

    crackNoise.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(master);
    crackNoise.start(startTime, Math.random() * 0.4);
    crackNoise.stop(startTime + config.crackDuration + 0.02);

    // 3. Explosive powder body (lowpass pink/white noise envelope)
    const bodyNoise = this.createNoiseSource(ctx, "pink");
    const bodyFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.setValueAtTime(config.bodyCutoff, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(140, config.bodyCutoff * 0.18),
      startTime + config.bodyDuration
    );

    bodyGain.gain.setValueAtTime(config.bodyGain, startTime);
    bodyGain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + config.bodyDuration
    );

    bodyNoise.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(master);
    bodyNoise.start(startTime, Math.random() * 0.4);
    bodyNoise.stop(startTime + config.bodyDuration + 0.02);

    // 4. Open desert canyon reflection tail
    const tailNoise = this.createNoiseSource(ctx, "pink");
    const tailFilter = ctx.createBiquadFilter();
    const tailGain = ctx.createGain();
    tailFilter.type = "bandpass";
    tailFilter.frequency.setValueAtTime(config.tailCutoff, startTime);
    tailFilter.frequency.exponentialRampToValueAtTime(
      Math.max(180, config.tailCutoff * 0.35),
      startTime + config.tailDuration
    );
    tailFilter.Q.setValueAtTime(0.7, startTime);

    tailGain.gain.setValueAtTime(0.001, startTime);
    tailGain.gain.linearRampToValueAtTime(
      config.tailGain,
      startTime + 0.025
    );
    tailGain.gain.exponentialRampToValueAtTime(
      0.0008,
      startTime + config.tailDuration
    );

    tailNoise.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(this.getEffectsOutput(ctx));
    tailNoise.start(startTime, Math.random() * 0.3);
    tailNoise.stop(startTime + config.tailDuration + 0.03);

    // 5. Optional breech/action metallic ring
    if (config.metallicFreq) {
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = "sine";
      ringOsc.frequency.setValueAtTime(config.metallicFreq, startTime);
      ringOsc.frequency.exponentialRampToValueAtTime(
        config.metallicFreq * 0.72,
        startTime + 0.045
      );
      ringGain.gain.setValueAtTime(0.11, startTime);
      ringGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
      ringOsc.connect(ringGain);
      ringGain.connect(this.getEffectsOutput(ctx));
      ringOsc.start(startTime);
      ringOsc.stop(startTime + 0.05);
    }
  }

  public playWeaponSound(weaponCategory: WeaponSoundCategory): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (weaponCategory) {
      case "melee": {
        // Air whoosh + steel blade scrape
        const whoosh = this.createNoiseSource(ctx, "pink");
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        filter.type = "bandpass";
        filter.Q.setValueAtTime(2.4, now);
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(1650, now + 0.075);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.19);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.42, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        whoosh.connect(filter);
        filter.connect(gain);
        gain.connect(this.getEffectsOutput(ctx));
        whoosh.start(now, Math.random() * 0.5);
        whoosh.stop(now + 0.22);

        // Metallic blade edge glint
        const bladeOsc = ctx.createOscillator();
        const bladeGain = ctx.createGain();
        bladeOsc.type = "sawtooth";
        bladeOsc.frequency.setValueAtTime(2400, now + 0.03);
        bladeOsc.frequency.exponentialRampToValueAtTime(680, now + 0.14);

        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(1500, now);

        bladeGain.gain.setValueAtTime(0.001, now + 0.03);
        bladeGain.gain.linearRampToValueAtTime(0.11, now + 0.05);
        bladeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        bladeOsc.connect(hp);
        hp.connect(bladeGain);
        bladeGain.connect(this.getEffectsOutput(ctx));
        bladeOsc.start(now + 0.03);
        bladeOsc.stop(now + 0.16);
        break;
      }

      case "pistol": {
        // Crisp 9mm/.45 semi-auto pop
        this.triggerSingleGunshot(ctx, now, {
          punchStartFreq: 210,
          punchEndFreq: 52,
          punchDuration: 0.075,
          punchGain: 0.52,
          crackFreq: 2200,
          crackQ: 1.5,
          crackDuration: 0.065,
          crackGain: 0.58,
          bodyCutoff: 1900,
          bodyDuration: 0.14,
          bodyGain: 0.45,
          tailDuration: 0.28,
          tailCutoff: 950,
          tailGain: 0.14,
          metallicFreq: 3100,
        });
        break;
      }

      case "revolver": {
        // Heavy .44 Magnum desert cannon bark
        this.triggerSingleGunshot(ctx, now, {
          punchStartFreq: 165,
          punchEndFreq: 36,
          punchDuration: 0.13,
          punchGain: 0.72,
          crackFreq: 1550,
          crackQ: 1.2,
          crackDuration: 0.11,
          crackGain: 0.68,
          bodyCutoff: 1600,
          bodyDuration: 0.24,
          bodyGain: 0.62,
          tailDuration: 0.48,
          tailCutoff: 760,
          tailGain: 0.22,
          metallicFreq: 1950,
        });
        break;
      }

      case "shotgun": {
        // Devastating 12-gauge double-barrel / pump blast
        this.triggerSingleGunshot(ctx, now, {
          punchStartFreq: 130,
          punchEndFreq: 26,
          punchDuration: 0.19,
          punchGain: 0.85,
          crackFreq: 1100,
          crackQ: 0.75,
          crackDuration: 0.16,
          crackGain: 0.78,
          bodyCutoff: 2400,
          bodyDuration: 0.34,
          bodyGain: 0.75,
          tailDuration: 0.65,
          tailCutoff: 620,
          tailGain: 0.28,
        });
        // Secondary pellet spread burst
        const spreadNoise = this.createNoiseSource(ctx, "white");
        const spreadFilter = ctx.createBiquadFilter();
        const spreadGain = ctx.createGain();
        spreadFilter.type = "bandpass";
        spreadFilter.frequency.setValueAtTime(3200, now + 0.012);
        spreadFilter.Q.setValueAtTime(0.9, now + 0.012);
        spreadGain.gain.setValueAtTime(0.35, now + 0.012);
        spreadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        spreadNoise.connect(spreadFilter);
        spreadFilter.connect(spreadGain);
        spreadGain.connect(this.getEffectsOutput(ctx));
        spreadNoise.start(now + 0.012, Math.random() * 0.5);
        spreadNoise.stop(now + 0.15);
        break;
      }

      case "rifle": {
        // High-velocity 7.62mm carbine/battle rifle crack
        this.triggerSingleGunshot(ctx, now, {
          punchStartFreq: 185,
          punchEndFreq: 42,
          punchDuration: 0.11,
          punchGain: 0.65,
          crackFreq: 2750,
          crackQ: 1.8,
          crackDuration: 0.085,
          crackGain: 0.74,
          bodyCutoff: 2300,
          bodyDuration: 0.2,
          bodyGain: 0.55,
          tailDuration: 0.45,
          tailCutoff: 880,
          tailGain: 0.2,
          metallicFreq: 2650,
        });
        break;
      }

      case "smg": {
        // 3-round rapid automatic burst
        const burstOffsets = [0, 0.068, 0.136];
        for (let i = 0; i < burstOffsets.length; i++) {
          const shotTime = now + burstOffsets[i];
          const pitchJitter = 1 + (i - 1) * 0.04;
          this.triggerSingleGunshot(ctx, shotTime, {
            punchStartFreq: 225 * pitchJitter,
            punchEndFreq: 58,
            punchDuration: 0.055,
            punchGain: 0.42,
            crackFreq: 2450 * pitchJitter,
            crackQ: 1.6,
            crackDuration: 0.05,
            crackGain: 0.48,
            bodyCutoff: 2100,
            bodyDuration: 0.09,
            bodyGain: 0.36,
            tailDuration: 0.2,
            tailCutoff: 1050,
            tailGain: 0.1,
            metallicFreq: 3400 * pitchJitter,
          });
        }
        break;
      }

      case "sniper": {
        // Long-range precision rifle supersonic whip + deep canyon thunder
        this.triggerSingleGunshot(ctx, now, {
          punchStartFreq: 150,
          punchEndFreq: 24,
          punchDuration: 0.22,
          punchGain: 0.88,
          crackFreq: 3600,
          crackQ: 2.2,
          crackDuration: 0.12,
          crackGain: 0.85,
          bodyCutoff: 2800,
          bodyDuration: 0.32,
          bodyGain: 0.68,
          tailDuration: 0.82,
          tailCutoff: 720,
          tailGain: 0.32,
          metallicFreq: 2200,
        });

        // Supersonic ballistic whip-crack transient
        const whipOsc = ctx.createOscillator();
        const whipGain = ctx.createGain();
        whipOsc.type = "sawtooth";
        whipOsc.frequency.setValueAtTime(4200, now);
        whipOsc.frequency.exponentialRampToValueAtTime(480, now + 0.045);
        whipGain.gain.setValueAtTime(0.28, now);
        whipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
        whipOsc.connect(whipGain);
        whipGain.connect(this.getEffectsOutput(ctx));
        whipOsc.start(now);
        whipOsc.stop(now + 0.05);
        break;
      }
    }
  }

  public playReloadSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 3-step metallic bolt/cylinder mechanical clack sequence
    const clicks: Array<{
      offset: number;
      freqA: number;
      freqB: number;
      noiseFreq: number;
      duration: number;
      gain: number;
    }> = [
      // 1. Magazine latch / cylinder release click
      {
        offset: 0,
        freqA: 1850,
        freqB: 1120,
        noiseFreq: 2600,
        duration: 0.045,
        gain: 0.25,
      },
      // 2. Heavy metallic bolt/slide pullback scrape
      {
        offset: 0.14,
        freqA: 980,
        freqB: 1540,
        noiseFreq: 1950,
        duration: 0.075,
        gain: 0.32,
      },
      // 3. Sharp chamber lock clack
      {
        offset: 0.27,
        freqA: 2450,
        freqB: 1620,
        noiseFreq: 3400,
        duration: 0.055,
        gain: 0.38,
      },
    ];

    for (const click of clicks) {
      const start = now + click.offset;

      // Metallic resonant body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(click.freqA, start);
      osc.frequency.exponentialRampToValueAtTime(
        click.freqB,
        start + click.duration
      );

      oscGain.gain.setValueAtTime(click.gain, start);
      oscGain.gain.exponentialRampToValueAtTime(0.001, start + click.duration);

      osc.connect(oscGain);
      oscGain.connect(this.getEffectsOutput(ctx));
      osc.start(start);
      osc.stop(start + click.duration + 0.01);

      // Steel friction transient
      const noise = this.createNoiseSource(ctx, "white");
      const bp = ctx.createBiquadFilter();
      const nGain = ctx.createGain();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(click.noiseFreq, start);
      bp.Q.setValueAtTime(4.5, start);

      nGain.gain.setValueAtTime(click.gain * 0.85, start);
      nGain.gain.exponentialRampToValueAtTime(0.001, start + click.duration);

      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.getEffectsOutput(ctx));
      noise.start(start, Math.random() * 0.5);
      noise.stop(start + click.duration + 0.01);
    }
  }

  public playHitSound(isCritical = false): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Heavy flesh/kevlar impact thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = "sine";
    thudOsc.frequency.setValueAtTime(isCritical ? 165 : 125, now);
    thudOsc.frequency.exponentialRampToValueAtTime(32, now + 0.11);

    thudGain.gain.setValueAtTime(isCritical ? 0.68 : 0.52, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thudOsc.connect(thudGain);
    thudGain.connect(this.getEffectsOutput(ctx));
    thudOsc.start(now);
    thudOsc.stop(now + 0.13);

    // Visceral impact noise punch
    const impactNoise = this.createNoiseSource(ctx, "pink");
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isCritical ? 1450 : 680, now);
    filter.Q.setValueAtTime(isCritical ? 1.4 : 1.0, now);

    noiseGain.gain.setValueAtTime(isCritical ? 0.55 : 0.36, now);
    noiseGain.gain.exponentialRampToValueAtTime(
      0.001,
      now + (isCritical ? 0.13 : 0.09)
    );

    impactNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getEffectsOutput(ctx));
    impactNoise.start(now, Math.random() * 0.5);
    impactNoise.stop(now + 0.14);

    if (isCritical) {
      // Sharp skull/helmet crack transient for critical hits
      const crackOsc = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crackOsc.type = "sawtooth";
      crackOsc.frequency.setValueAtTime(2900, now);
      crackOsc.frequency.exponentialRampToValueAtTime(520, now + 0.065);

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1100, now);

      crackGain.gain.setValueAtTime(0.42, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      crackOsc.connect(hp);
      hp.connect(crackGain);
      crackGain.connect(this.getEffectsOutput(ctx));
      crackOsc.start(now);
      crackOsc.stop(now + 0.075);
    }
  }

  public playMissRicochet(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Dry dirt/rock dust puff
    const dustNoise = this.createNoiseSource(ctx, "pink");
    const dustFilter = ctx.createBiquadFilter();
    const dustGain = ctx.createGain();
    dustFilter.type = "bandpass";
    dustFilter.frequency.setValueAtTime(1350, now);
    dustFilter.Q.setValueAtTime(2.0, now);

    dustGain.gain.setValueAtTime(0.24, now);
    dustGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    dustNoise.connect(dustFilter);
    dustFilter.connect(dustGain);
    dustGain.connect(this.getEffectsOutput(ctx));
    dustNoise.start(now, Math.random() * 0.4);
    dustNoise.stop(now + 0.08);

    // 2. Classic western spinning lead ricochet whine ("pew-w-w")
    const whineOsc = ctx.createOscillator();
    const whineFilter = ctx.createBiquadFilter();
    const whineGain = ctx.createGain();

    const startFreq = 2600 + Math.random() * 550;
    whineOsc.type = "sine";
    whineOsc.frequency.setValueAtTime(startFreq, now + 0.01);
    whineOsc.frequency.exponentialRampToValueAtTime(
      startFreq * 1.18,
      now + 0.045
    );
    whineOsc.frequency.exponentialRampToValueAtTime(480, now + 0.29);

    whineFilter.type = "bandpass";
    whineFilter.frequency.setValueAtTime(1800, now + 0.01);
    whineFilter.Q.setValueAtTime(3.2, now + 0.01);

    whineGain.gain.setValueAtTime(0.001, now + 0.01);
    whineGain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    whineOsc.connect(whineFilter);
    whineFilter.connect(whineGain);
    whineGain.connect(this.getEffectsOutput(ctx));
    whineOsc.start(now + 0.01);
    whineOsc.stop(now + 0.31);
  }

  public playStepSound(terrain = "sand"): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const normalized = terrain.toLowerCase();

    let centerFreq = 950;
    let qValue = 1.6;
    let duration = 0.085;
    if (normalized.includes("rock") || normalized.includes("road")) {
      centerFreq = 1350;
      qValue = 2.4;
      duration = 0.065;
    } else if (normalized.includes("scrub") || normalized.includes("brush")) {
      centerFreq = 1600;
      qValue = 1.2;
      duration = 0.1;
    }

    // Boot heel impact + shifting desert grit crunch
    const crunch = this.createNoiseSource(ctx, "pink");
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const jitter = 0.9 + Math.random() * 0.2;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(centerFreq * jitter, now);
    filter.frequency.exponentialRampToValueAtTime(
      centerFreq * 0.55 * jitter,
      now + duration
    );
    filter.Q.setValueAtTime(qValue, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    crunch.connect(filter);
    filter.connect(gain);
    gain.connect(this.getEffectsOutput(ctx));
    crunch.start(now, Math.random() * 0.8);
    crunch.stop(now + duration + 0.015);
  }

  public playCashSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Cascading silver/brass coins clinking in a leather pouch
    const coinHits: Array<{ offset: number; freq1: number; freq2: number; gain: number }> = [
      { offset: 0, freq1: 2480, freq2: 5120, gain: 0.18 },
      { offset: 0.055, freq1: 2960, freq2: 6180, gain: 0.21 },
      { offset: 0.115, freq1: 3520, freq2: 7240, gain: 0.24 },
    ];

    for (const coin of coinHits) {
      const t = now + coin.offset;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const coinGain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(coin.freq1, t);
      osc2.frequency.setValueAtTime(coin.freq2, t);

      coinGain.gain.setValueAtTime(0.001, t);
      coinGain.gain.linearRampToValueAtTime(coin.gain, t + 0.004);
      coinGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);

      osc1.connect(coinGain);
      osc2.connect(coinGain);
      coinGain.connect(this.getEffectsOutput(ctx));

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    }
  }

  public playTravelTick(propulsion: PropulsionSoundType): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (propulsion) {
      case "human": {
        this.playStepSound("sand");
        break;
      }

      case "animal": {
        // Alternating clip-clop hoofbeat + subtle wooden wagon creak
        this.hoofToggle = !this.hoofToggle;
        const baseFreq = this.hoofToggle ? 620 : 490;

        const hoofNoise = this.createNoiseSource(ctx, "pink");
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(baseFreq, now);
        filter.Q.setValueAtTime(5.2, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        hoofNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.getEffectsOutput(ctx));
        hoofNoise.start(now, Math.random() * 0.6);
        hoofNoise.stop(now + 0.065);

        // Subtle leather harness / wagon timber creak on every second beat
        if (this.hoofToggle) {
          const creakOsc = ctx.createOscillator();
          const creakFilter = ctx.createBiquadFilter();
          const creakGain = ctx.createGain();

          creakOsc.type = "sawtooth";
          creakOsc.frequency.setValueAtTime(215, now + 0.02);
          creakOsc.frequency.linearRampToValueAtTime(265, now + 0.075);

          creakFilter.type = "bandpass";
          creakFilter.frequency.setValueAtTime(520, now + 0.02);
          creakFilter.Q.setValueAtTime(4.0, now + 0.02);

          creakGain.gain.setValueAtTime(0.001, now + 0.02);
          creakGain.gain.linearRampToValueAtTime(0.035, now + 0.04);
          creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

          creakOsc.connect(creakFilter);
          creakFilter.connect(creakGain);
          creakGain.connect(this.getEffectsOutput(ctx));
          creakOsc.start(now + 0.02);
          creakOsc.stop(now + 0.09);
        }
        break;
      }

      case "motor": {
        // Low desert diesel/V8 cylinder chug + exhaust puff
        const engineOsc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        engineOsc.type = "sawtooth";
        engineOsc.frequency.setValueAtTime(64, now);
        engineOsc.frequency.exponentialRampToValueAtTime(46, now + 0.095);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(210, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        engineOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.getEffectsOutput(ctx));
        engineOsc.start(now);
        engineOsc.stop(now + 0.11);
        break;
      }
    }
  }

  public playEncounterAlert(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tense Morricone/Caravaneer minor-diminished desert ambush brass sting (D2, A2, F3, Ab3, D4)
    const freqs = [73.42, 110.0, 174.61, 207.65, 293.66];

    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = i < 2 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freqs[i], now);
      // Slight ominous pitch bend downward at the tail
      osc.frequency.linearRampToValueAtTime(freqs[i] * 0.985, now + 0.78);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(2100, now + 0.09);
      filter.frequency.exponentialRampToValueAtTime(540, now + 0.8);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getEffectsOutput(ctx));

      osc.start(now);
      osc.stop(now + 0.85);
    }

    // Sharp metallic percussion rattle transient
    const rattle = this.createNoiseSource(ctx, "white");
    const rattleFilter = ctx.createBiquadFilter();
    const rattleGain = ctx.createGain();
    rattleFilter.type = "bandpass";
    rattleFilter.frequency.setValueAtTime(2800, now);
    rattleFilter.Q.setValueAtTime(3.5, now);
    rattleGain.gain.setValueAtTime(0.18, now);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    rattle.connect(rattleFilter);
    rattleFilter.connect(rattleGain);
    rattleGain.connect(this.getEffectsOutput(ctx));
    rattle.start(now, 0.2);
    rattle.stop(now + 0.17);
  }

  public playVictorySting(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Triumphant dusty western chord arpeggio (D Major / Mixolydian warmth: D3, A3, D4, F#4, A4)
    const notes: Array<{ freq: number; offset: number; duration: number; gain: number }> = [
      { freq: 146.83, offset: 0.0, duration: 0.95, gain: 0.14 },
      { freq: 220.0, offset: 0.05, duration: 0.9, gain: 0.13 },
      { freq: 293.66, offset: 0.1, duration: 0.85, gain: 0.13 },
      { freq: 369.99, offset: 0.15, duration: 0.85, gain: 0.14 },
      { freq: 440.0, offset: 0.21, duration: 0.95, gain: 0.16 },
    ];

    for (const note of notes) {
      const start = now + note.offset;
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      subOsc.type = "triangle";
      osc.frequency.setValueAtTime(note.freq, start);
      subOsc.frequency.setValueAtTime(note.freq * 0.5, start);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, start);
      filter.frequency.exponentialRampToValueAtTime(
        680,
        start + note.duration
      );

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(note.gain, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + note.duration);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getEffectsOutput(ctx));

      osc.start(start);
      subOsc.start(start);
      osc.stop(start + note.duration + 0.03);
      subOsc.stop(start + note.duration + 0.03);
    }
  }

  public playMedicalSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(329.63, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getEffectsOutput(ctx));

    osc.start(now);
    osc.stop(now + 0.36);
  }
}

export const soundEngine = new WastelandSoundEngine();
export default soundEngine;
