import type { TtsSettings } from '../types/store';
import { useAppStore } from '../store/useAppStore';

class TtsService {
  private audio: HTMLAudioElement | null = null;

  async speak(text: string, settings: TtsSettings, voiceId?: string, messageId?: string) {
    if (!settings.enabled) return;
    if (!text) return;

    this.stop();
    if (messageId) useAppStore.getState().setActiveAudioId(messageId);

    const providerType = settings.provider;
    const { speed, pitch } = settings.globalSettings;

    if (providerType === 'browser') {
      this.speakBrowser(text, voiceId, speed, pitch);
    } else if (providerType === 'openai') {
      const state = useAppStore.getState();
      const activeProvider = state.config.providers.find(p => p.id === state.config.activeTtsProviderId ?? state.activeTtsProviderId);
      
      if (activeProvider?.apiKey) {
        await this.speakOpenAI(
          text,
          voiceId ?? activeProvider.ttsVoice,
          activeProvider.apiKey,
          activeProvider.endpoint,
          activeProvider.model,
          speed,
          activeProvider.ttsFormat,
        );
      } else {
        console.warn('[TTS] 未绑定有效的 TTS 供应商节点');
      }
    } else if (providerType === 'elevenlabs') {
      // 保留原有的独立配置作为降级或后续也迁移到 Provider 体系
      await this.speakElevenLabs(text, voiceId, settings.globalSettings.apiKey, settings.globalSettings.elevenlabsModel, speed);
    } else if (providerType === 'edge') {
      this.speakBrowser(text, voiceId, speed, pitch);
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    window.speechSynthesis.cancel();
    useAppStore.getState().setActiveAudioId(null);
  }

  private speakBrowser(text: string, voiceId?: string, speed: number = 1, pitch: number = 1, messageId?: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceId) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceId || v.voiceURI === voiceId);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.onend = () => useAppStore.getState().setActiveAudioId(null);
    utterance.onerror = () => useAppStore.getState().setActiveAudioId(null);
    window.speechSynthesis.speak(utterance);
  }

  private async speakOpenAI(
    text: string,
    voiceId?: string,
    apiKey?: string,
    endpoint?: string,
    model: string = 'tts-1',
    speed: number = 1,
    format: string = 'mp3',
  ) {
    if (!apiKey) return;
    const url = `${endpoint?.replace(/\/+$/, '') || 'https://api.openai.com/v1'}/audio/speech`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          voice: voiceId || 'alloy',
          speed,
          response_format: format,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI TTS failed: ${response.status}`);
      this.playBlob(await response.blob());
    } catch (e) {
      console.error('[TTS] OpenAI error:', e);
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
          text,
          model_id: model,
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
          // ElevenLabs v3 speed control
          ...(speed !== 1 ? { pronunciation_dictionary_locators: [], speed } : {}),
        }),
      });

      if (!response.ok) throw new Error(`ElevenLabs TTS failed: ${response.status}`);
      this.playBlob(await response.blob());
    } catch (e) {
      console.error('[TTS] ElevenLabs error:', e);
    }
  }

  private playBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    this.audio = new Audio(url);
    const cleanup = () => {
      URL.revokeObjectURL(url);
      useAppStore.getState().setActiveAudioId(null);
    };
    this.audio.onended = cleanup;
    this.audio.onerror = cleanup;
    this.audio.play();
  }
}

export const ttsService = new TtsService();
