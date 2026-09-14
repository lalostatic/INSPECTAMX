import { useState, useRef, useCallback } from 'react';
import { Camera, Video, Upload, X, Image, Film } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { queueMedia } from '~/lib/offline/queue';
import { isOnline } from '~/lib/offline/sync';
import { uploadMedia } from '~/lib/api';

interface MediaCaptureProps {
  entityType: 'inspection' | 'work_order' | 'incident';
  entityId: string;
  onCapture?: (mediaId: string | null, r2Key?: string) => void;
  className?: string;
}

interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  file: File;
  synced: boolean;
}

export function MediaCapture({ entityType, entityId, onCapture, className }: MediaCaptureProps) {
  const [media, setMedia] = useState<CapturedMedia[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capturePhoto = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);

      stream.getTracks().forEach((t) => t.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const filename = `photo-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        let synced = false;
        let r2Key: string | undefined;

        if (isOnline()) {
          try {
            const result = await uploadMedia(entityType, entityId, file);
            r2Key = result.r2_key;
            synced = true;
          } catch {
            await queueMedia(entityType, entityId, file);
          }
        } else {
          await queueMedia(entityType, entityId, file);
        }

        const item: CapturedMedia = {
          id: crypto.randomUUID(),
          type: 'photo',
          url,
          file,
          synced,
        };

        setMedia((prev) => [...prev, item]);
        onCapture?.(item.id, r2Key);
      }, 'image/jpeg', 0.85);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  }, [entityType, entityId, onCapture]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const filename = `video-${Date.now()}.webm`;
        const file = new File([blob], filename, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        let synced = false;
        let r2Key: string | undefined;

        if (isOnline()) {
          try {
            const result = await uploadMedia(entityType, entityId, file);
            r2Key = result.r2_key;
            synced = true;
          } catch {
            await queueMedia(entityType, entityId, file);
          }
        } else {
          await queueMedia(entityType, entityId, file);
        }

        const item: CapturedMedia = {
          id: crypto.randomUUID(),
          type: 'video',
          url,
          file,
          synced,
        };

        setMedia((prev) => [...prev, item]);
        onCapture?.(item.id, r2Key);
      };

      recorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      setRecordingTime(0);

      // Auto stop at 10 seconds
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 9) {
            stopRecording();
            return 10;
          }
          return t + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [entityType, entityId, onCapture]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setRecordingTime(0);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);

      let synced = false;
      let r2Key: string | undefined;

      if (isOnline()) {
        try {
          const result = await uploadMedia(entityType, entityId, file);
          r2Key = result.r2_key;
          synced = true;
        } catch {
          await queueMedia(entityType, entityId, file);
        }
      } else {
        await queueMedia(entityType, entityId, file);
      }

      const item: CapturedMedia = {
        id: crypto.randomUUID(),
        type: isVideo ? 'video' : 'photo',
        url,
        file,
        synced,
      };

      setMedia((prev) => [...prev, item]);
      onCapture?.(item.id, r2Key);
    }
    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((m) => m.id !== id);
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={capturePhoto}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Foto
        </Button>

        {!recording ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            Video (10s)
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
            Detener ({10 - recordingTime}s)
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Subir archivo
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Recording preview */}
      {recording && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} className="w-full max-h-48 object-contain" muted />
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
            {recordingTime}s / 10s
          </div>
        </div>
      )}

      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {media.map((item) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
              {item.type === 'photo' ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Film className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => removeMedia(item.id)}
                  className="p-1 bg-red-500 rounded-full text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Type badge */}
              <div className="absolute top-1 left-1">
                {item.type === 'photo' ? (
                  <Image className="h-3 w-3 text-white drop-shadow" />
                ) : (
                  <Film className="h-3 w-3 text-white drop-shadow" />
                )}
              </div>

              {/* Sync indicator */}
              {!item.synced && (
                <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400" title="Pendiente de sincronizar" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
