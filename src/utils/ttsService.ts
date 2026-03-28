import type { TtsSettings } from '../store/useAppStore';

class TtsService {
  private audio: HTMLAudioElement | null = null;

  async speak(text: string, settings: TtsSettings, voiceId?: string) {
    if (!settings.enabled) return;
    if (!text) return;

    this.stop();

    const provider = settings.provider;
    const { speed, pitch, apiKey, endpoint, openaiModel, elevenlabsModel } = settings.globalSettings;

    if (provider === 'browser') {
      this.speakBrowser(text, voiceId, speed, pitch);
    } else if (provider === 'openai') {
      await this.speakOpenAI(text, voiceId, apiKey, endpoint, openaiModel, speed);
    } else if (provider === 'elevenlabs') {
      await this.speakElevenLabs(text, voiceId, apiKey, elevenlabsModel, speed);
    } else if (provider === 'edge') {
      // Edge TTS often requires a backend, but we can use a placeholder or 
      // a public API if one is known. For now, fallback to browser.
      this.speakBrowser(text, voiceId, speed, pitch);
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    window.speechSynthesis.cancel();
  }

  private speakBrowser(text: string, voiceId?: string, speed: number = 1, pitch: number = 1) {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceId) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceId || v.voiceURI === voiceId);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = speed;
    utterance.pitch = pitch;
    window.speechSynthesis.speak(utterance);
  }

  private async speakOpenAI(text: string, voiceId?: string, apiKey?: string, endpoint?: string, model: string = 'tts-1', speed: number = 1) {
    if (!apiKey) return;
    const url = `${endpoint || 'https://api.openai.com/v1'}/audio/speech`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: text,
          voice: voiceId || 'alloy',
          speed: speed,
        }),
      });

      if (!response.ok) throw new Error('OpenAI TTS failed');

      const blob = await response.blob();
      this.playBlob(blob);
    } catch (e) {
      console.error(e);
    }
  }

  private async speakElevenLabs(text: string, voiceId?: string, apiKey?: string, model: string = 'eleven_monolingual_v1', speed: number = 1) {
    if (!apiKey || !voiceId) return;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) throw new Error('ElevenLabs TTS failed');

      const blob = await response.blob();
      this.playBlob(blob);
    } catch (e) {
      console.error(e);
    }
  }

  private playBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.audio = new Audio(url);
    this.audio.play();
    this.audio.onended = () => URL.revokeObjectURL(url);
  }
}

export const ttsService = new TtsService();
