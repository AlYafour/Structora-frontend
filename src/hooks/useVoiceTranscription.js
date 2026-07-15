import { useCallback, useEffect, useRef, useState } from 'react';
import { aiTextApi } from '../services/ai/aiTextApi';

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

export function useVoiceTranscription({ language, field, prompt, onTranscribed } = {}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const onTranscribedRef = useRef(onTranscribed);

  useEffect(() => {
    onTranscribedRef.current = onTranscribed;
  }, [onTranscribed]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanupStream, [cleanupStream]);

  const transcribeBlob = useCallback(async (blob) => {
    if (!blob?.size) return;

    setTranscribing(true);
    setError('');
    try {
      const data = await aiTextApi.transcribeAudio(blob, { language, field, prompt });
      const text = data?.text?.trim();
      if (text) {
        onTranscribedRef.current?.(text);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || 'voice_transcription_failed';
      setError(detail);
    } finally {
      setTranscribing(false);
    }
  }, [field, language, prompt]);

  const startRecording = useCallback(async () => {
    if (recording || transcribing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('voice_recording_not_supported');
      return;
    }

    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        cleanupStream();
        setRecording(false);
        transcribeBlob(blob);
      };

      recorder.start();
      setRecording(true);
    } catch {
      cleanupStream();
      setRecording(false);
      setError('microphone_permission_denied');
    }
  }, [cleanupStream, recording, transcribeBlob, transcribing]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return {
    recording,
    transcribing,
    busy: recording || transcribing,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
