import { FaMicrophone, FaStop } from 'react-icons/fa';
import Button from './Button';

export default function VoiceNoteButton({
  recording,
  transcribing,
  disabled,
  onClick,
  t,
  className = '',
  iconOnly = false,
  showNativeTooltip = true,
}) {
  const label = recording
    ? t('stop_recording', 'Stop Recording')
    : transcribing
      ? t('transcribing_voice', 'Transcribing...')
      : t('record_voice_note', 'Record Voice Note');

  return (
    <Button
      type="button"
      size={iconOnly ? 'icon' : 'sm'}
      variant={recording ? 'secondary' : 'ghost'}
      loading={transcribing}
      disabled={disabled || transcribing}
      startIcon={recording ? <FaStop /> : <FaMicrophone />}
      onClick={onClick}
      className={`voice-note-btn ${iconOnly ? 'voice-note-btn--icon-only' : ''} ${recording ? 'voice-note-btn--recording' : ''} ${className}`.trim()}
      aria-label={label}
      title={showNativeTooltip ? label : undefined}
    >
      {!iconOnly && label}
    </Button>
  );
}
