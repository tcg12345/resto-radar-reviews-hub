import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Bot, Sparkles, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Audio utilities
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      console.log('Starting audio recorder...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Audio recorder started successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    console.log('Stopping audio recorder...');
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  // Convert bytes to 16-bit samples (little endian)
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header parameters
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  // Combine header and data
  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    console.log('Adding audio to queue, length:', audioData.length);
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log('Audio queue empty, stopping playback');
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;
    console.log('Playing audio chunk, length:', audioData.length);

    try {
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.log('Audio chunk finished, playing next');
        this.playNext();
      };
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  clear() {
    console.log('Clearing audio queue');
    this.queue = [];
    this.isPlaying = false;
  }
}

let audioQueueInstance: AudioQueue | null = null;

const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RealtimeVoiceAssistantProps {
  onClose?: () => void;
}

export function RealtimeVoiceAssistant({ onClose }: RealtimeVoiceAssistantProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isMuted) {
      const base64Audio = encodeAudioForAPI(audioData);
      const event = {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      };
      wsRef.current.send(JSON.stringify(event));
    }
  }, [isMuted]);

  const connect = async () => {
    try {
      console.log('Connecting to realtime chat...');
      
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Connect WebSocket
      const ws = new WebSocket('wss://ocpmhsquwsdaauflbygf.functions.supabase.co/realtime-chat');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast.success('Voice assistant connected!');
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message type:', data.type);

        if (data.type === 'response.audio.delta') {
          setIsAISpeaking(true);
          // Convert base64 to Uint8Array
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (audioContextRef.current) {
            await playAudioData(audioContextRef.current, bytes);
          }
        } else if (data.type === 'response.audio.done') {
          setIsAISpeaking(false);
          console.log('Audio response completed');
        } else if (data.type === 'response.audio_transcript.delta') {
          setCurrentTranscript(prev => prev + data.delta);
        } else if (data.type === 'response.audio_transcript.done') {
          if (currentTranscript.trim()) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              type: 'assistant',
              content: currentTranscript,
              timestamp: new Date()
            }]);
          }
          setCurrentTranscript('');
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          if (data.transcript.trim()) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              type: 'user',
              content: data.transcript,
              timestamp: new Date()
            }]);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsRecording(false);
        setIsAISpeaking(false);
      };

    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Failed to connect to voice assistant');
    }
  };

  const disconnect = () => {
    console.log('Disconnecting...');
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioQueueInstance) {
      audioQueueInstance.clear();
    }

    setIsConnected(false);
    setIsRecording(false);
    setIsAISpeaking(false);
    toast.info('Voice assistant disconnected');
  };

  const startRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(onAudioData);
      }
      await audioRecorderRef.current.start();
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted');
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Voice Assistant
            <Sparkles className="h-4 w-4 text-yellow-500" />
            {isAISpeaking && (
              <Badge variant="default" className="animate-pulse">
                Speaking...
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {!isConnected && (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Connect to start voice conversations with your AI restaurant assistant
                </p>
                <Button onClick={connect}>
                  Connect Voice Assistant
                </Button>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {message.type === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {currentTranscript && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    🤖
                  </div>
                  <div className="rounded-lg p-3 bg-muted">
                    <p className="text-sm whitespace-pre-wrap">{currentTranscript}</p>
                    <div className="flex gap-1 mt-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {isConnected && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isRecording ? "default" : "outline"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className={`rounded-full w-16 h-16 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
              >
                {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMute}
                className={`rounded-full w-12 h-12 ${isMuted ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              <Button
                variant="outline"
                onClick={disconnect}
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </div>
            
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">
                {isRecording ? (
                  <span className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Recording... Speak now
                  </span>
                ) : (
                  "Click microphone to start talking"
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}