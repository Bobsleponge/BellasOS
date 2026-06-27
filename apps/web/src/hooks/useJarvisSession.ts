'use client';



import { useCallback, useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import {

  api,

  type JarvisChatResponse,

  type JarvisMessage,

  type JarvisSessionSummary,

} from '@/lib/api';

import {

  applicationFromPathname,

  currentRhythm,

  hasBriefingForRhythm,

  markBriefingDelivered,

  readActiveWorkspaceId,

} from '@/lib/jarvisRhythm';

import { useConsoleNavigation } from '@/hooks/useConsoleNavigation';
import { applyJarvisModeSwitch, isOperatingMode } from '@/lib/operatingMode';

import { canAcceptSpeechInput, useShellStore } from '@/stores/shellStore';

import { speakText, speakTextAsync, stopSpeaking } from '@/lib/speechOutput';

import { sanitizeJarvisReply, shouldRejectVoiceTranscript } from '@/lib/transcriptGuard';

import { pickJarvisAcknowledgment } from '@/lib/jarvisAcknowledgments';

import { isVoiceCancelCommand } from '@/lib/voiceCancel';

import { queryKeys } from '@/lib/queryKeys';

const SESSION_STORAGE_KEY = 'bellasos:jarvis:sessionId';

let bootstrapStarted = false;

let activeChatAbort: AbortController | null = null;



function resolveOperatingMode(_application?: string): string {
  return useShellStore.getState().operatingMode;
}

function messagesToTranscript(messages: JarvisMessage[]) {

  return messages.map((message) => ({

    role: message.role,

    text: message.content,

  }));

}



function persistSessionId(sessionId: string) {

  try {

    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

  } catch {

    /* ignore */

  }

}



function currentSearchString(): string {
  if (typeof window === 'undefined') return '';
  const search = window.location.search;
  return search.startsWith('?') ? search.slice(1) : search;
}

function readStoredSessionId(): string | null {

  try {

    return localStorage.getItem(SESSION_STORAGE_KEY);

  } catch {

    return null;

  }

}



function isStaticGreetingOnly(

  transcript: Array<{ role: string; text: string }>,

): boolean {

  if (transcript.length === 0) return true;

  if (transcript.length > 1) return false;

  const text = transcript[0]?.text ?? '';

  return /Ask me anything|pick an application|Good morning|Good afternoon|Good evening/.test(text);

}



export function useJarvisBootstrap() {

  const setJarvisSessionId = useShellStore((s) => s.setJarvisSessionId);

  const setJarvisSessions = useShellStore((s) => s.setJarvisSessions);

  const setTranscript = useShellStore((s) => s.setTranscript);

  const setLastBriefingInsights = useShellStore((s) => s.setLastBriefingInsights);

  const pathname = usePathname();

  const arrivalRequested = useRef(false);



  useEffect(() => {

    if (bootstrapStarted) return;

    bootstrapStarted = true;



    void (async () => {

      try {

        const [{ sessions }, storedId] = await Promise.all([

          api.jarvisSessions(),

          Promise.resolve(readStoredSessionId()),

        ]);

        setJarvisSessions(sessions);



        let sessionId: string;

        let hasHistory = false;



        if (storedId) {

          try {

            const loaded = await api.jarvisGetSession(storedId);

            sessionId = storedId;

            setJarvisSessionId(storedId);

            persistSessionId(storedId);

            if (loaded.messages.length > 0) {

              setTranscript(messagesToTranscript(loaded.messages));

              hasHistory = true;

            }

          } catch {

            const created = await api.jarvisCreateSession();

            sessionId = created.session.id;

            setJarvisSessionId(sessionId);

            persistSessionId(sessionId);

            setJarvisSessions([created.session, ...sessions]);

          }

        } else {

          const created = await api.jarvisCreateSession();

          sessionId = created.session.id;

          setJarvisSessionId(sessionId);

          persistSessionId(sessionId);

          setJarvisSessions([created.session, ...sessions]);

        }



        const rhythm = currentRhythm();

        if (rhythm === 'night') return;



        const application = applicationFromPathname(
          pathname,
          currentSearchString(),
        );

        const mode = resolveOperatingMode(application);
        const workspaceId = readActiveWorkspaceId();

        const transcript = useShellStore.getState().transcript;



        if (

          !arrivalRequested.current &&

          !hasBriefingForRhythm(rhythm) &&

          (!hasHistory || isStaticGreetingOnly(transcript))

        ) {

          arrivalRequested.current = true;

          try {

            const briefing = await api.jarvisBriefing({

              rhythm,

              application,

              mode,

              sessionId,

              workspaceId: workspaceId ?? undefined,

              persist: true,

            });

            if (briefing.transcript?.trim()) {

              setTranscript([{ role: 'jarvis', text: briefing.transcript }]);

              setLastBriefingInsights({

                goalProgress: briefing.goalProgress ?? briefing.briefing?.goalProgress,

                decisionRecommendations:

                  briefing.decisionRecommendations ?? briefing.briefing?.decisionRecommendations,

                worldPulse: briefing.worldPulse ?? briefing.briefing?.worldPulse,

                strategicInsights:

                  briefing.strategicInsights ?? briefing.briefing?.strategicInsights,

                nextActions: briefing.nextActions ?? briefing.briefing?.nextActions,

              });

              markBriefingDelivered(rhythm);

            }

          } catch {

            /* keep default greeting */

          }

        }

      } catch {

        const fallbackId = crypto.randomUUID();

        setJarvisSessionId(fallbackId);

        persistSessionId(fallbackId);

      }

    })();

  }, [pathname, setJarvisSessionId, setJarvisSessions, setLastBriefingInsights, setTranscript]);

}



export function useJarvisSession() {

  const qc = useQueryClient();

  const setEqState = useShellStore((s) => s.setEqState);

  const setJarvisPending = useShellStore((s) => s.setJarvisPending);

  const setHeardCaption = useShellStore((s) => s.setHeardCaption);

  const addTranscript = useShellStore((s) => s.addTranscript);

  const setTranscript = useShellStore((s) => s.setTranscript);

  const setJarvisSessionId = useShellStore((s) => s.setJarvisSessionId);

  const setJarvisSessions = useShellStore((s) => s.setJarvisSessions);

  const jarvisSessionId = useShellStore((s) => s.jarvisSessionId);

  const pathname = usePathname();

  const { navigateToApp } = useConsoleNavigation();

  const turnRef = useRef(0);

  const turnSnapshotRef = useRef(0);



  const cancelTurn = useCallback(

    (message = 'Stopped — say that again when you are ready.', rollback = true) => {

      turnRef.current += 1;

      activeChatAbort?.abort();

      activeChatAbort = null;

      stopSpeaking();

      setJarvisPending(false);

      setHeardCaption(null);

      if (rollback) {

        setTranscript(useShellStore.getState().transcript.slice(0, turnSnapshotRef.current));

      }

      const { voiceSessionActive, micListening } = useShellStore.getState();

      setEqState(voiceSessionActive && micListening ? 'listening' : 'idle');

      if (message) {

        addTranscript('jarvis', message);

      }

    },

    [addTranscript, setEqState, setHeardCaption, setJarvisPending, setTranscript],

  );



  const refreshSessions = useCallback(async () => {

    const { sessions } = await api.jarvisSessions();

    setJarvisSessions(sessions);

    return sessions;

  }, [setJarvisSessions]);



  const startNewConversation = useCallback(async () => {

    const { session } = await api.jarvisCreateSession();

    setJarvisSessionId(session.id);

    persistSessionId(session.id);

    setTranscript([{ role: 'jarvis', text: 'New conversation started. How can I help?' }]);

    await refreshSessions();

    return session;

  }, [refreshSessions, setJarvisSessionId, setTranscript]);



  const loadConversation = useCallback(

    async (session: JarvisSessionSummary) => {

      const loaded = await api.jarvisGetSession(session.id);

      setJarvisSessionId(session.id);

      persistSessionId(session.id);

      setTranscript(

        loaded.messages.length > 0

          ? messagesToTranscript(loaded.messages)

          : [{ role: 'jarvis', text: 'This conversation is empty. Say something to begin.' }],

      );

    },

    [setJarvisSessionId, setTranscript],

  );



  const sendMessage = useCallback(

    async (message: string, source: 'voice' | 'text' = 'text') => {

      const text = message.trim();

      if (!text) return;



      const state = useShellStore.getState();



      if (source === 'voice' && isVoiceCancelCommand(text)) {

        const active =

          state.jarvisPending || state.eqState === 'thinking' || state.eqState === 'speaking';

        cancelTurn('Stopped — say that again when you are ready.', active);

        return;

      }



      if (source === 'voice') {

        if (state.eqState !== 'transcribing' && !canAcceptSpeechInput(state.eqState)) {

          return;

        }

      } else if (state.eqState === 'thinking' || state.eqState === 'speaking') {

        return;

      }



      let sessionId = state.jarvisSessionId;

      if (!sessionId) {

        const { session } = await api.jarvisCreateSession();

        sessionId = session.id;

        setJarvisSessionId(session.id);

        persistSessionId(session.id);

      }



      if (source === 'voice' && shouldRejectVoiceTranscript(text)) {

        setHeardCaption(null);

        const { voiceSessionActive, micListening } = useShellStore.getState();

        setEqState(voiceSessionActive && micListening ? 'listening' : 'idle');

        return;

      }



      const turnId = ++turnRef.current;

      turnSnapshotRef.current = useShellStore.getState().transcript.length;

      setHeardCaption(null);

      stopSpeaking();

      addTranscript('user', text);

      setJarvisPending(true);



      const ack = pickJarvisAcknowledgment(text);

      const { voiceSessionActive, micListening } = useShellStore.getState();

      const shouldSpeak = source === 'voice' || (voiceSessionActive && micListening);



      if (ack) {

        addTranscript('jarvis', ack);

      }



      setEqState(ack && shouldSpeak ? 'speaking' : 'thinking');



      activeChatAbort?.abort();

      const chatAbort = new AbortController();

      activeChatAbort = chatAbort;



      const application = applicationFromPathname(
        pathname,
        currentSearchString(),
      );

      const mode = resolveOperatingMode(application);



      const chatPromise = (async () => {

        const codingProjectId = useShellStore.getState().activeCodingProjectId ?? undefined;
        const workspaceId = useShellStore.getState().activeWorkspaceId ?? undefined;
        const modeManual = useShellStore.getState().operatingModeManual;

        return api.jarvisChat(

          text,

          sessionId,

          source,

          codingProjectId,

          Boolean(ack),

          chatAbort.signal,

          application,

          mode,

          workspaceId,

          modeManual,

        );

      })();



      const ackSpeechPromise =

        ack && shouldSpeak

          ? speakTextAsync(ack).then(() => {

              if (turnId !== turnRef.current) return;

              if (useShellStore.getState().jarvisPending) {

                setEqState('thinking');

              }

            })

          : Promise.resolve();



      try {

        const res: JarvisChatResponse = await chatPromise;

        await ackSpeechPromise;

        if (turnId !== turnRef.current) return;



        if (res.sessionId && res.sessionId !== sessionId) {

          setJarvisSessionId(res.sessionId);

          persistSessionId(res.sessionId);

        }



        const reply = sanitizeJarvisReply(res.reply, text, source);

        addTranscript('jarvis', reply, res.suggestedApp ? { suggestedApp: res.suggestedApp } : undefined);

        void refreshSessions();

        if (res.workspaceId) {
          useShellStore.getState().setActiveWorkspaceId(res.workspaceId);
        }
        if (res.focusSessionId) {
          useShellStore.getState().setActiveFocusSessionId(res.focusSessionId);
        }

        if (res.workspaceId || res.focusSessionId) {
          void qc.invalidateQueries({ queryKey: queryKeys.today });
          void qc.invalidateQueries({ queryKey: queryKeys.workspaces });
          void qc.invalidateQueries({ queryKey: queryKeys.focusSession });
        }

        if (res.modeSwitched && res.operatingMode && isOperatingMode(res.operatingMode)) {
          applyJarvisModeSwitch(qc, res.operatingMode);
        }

        if (res.openApp) {

          const extra = res.codingProjectId ? { project: res.codingProjectId } : undefined;

          if (res.codingProjectId) {

            useShellStore.getState().setActiveCodingProjectId(res.codingProjectId);

          }

          navigateToApp(res.openApp, extra);

        }

        const speakFinal = source === 'voice' || (voiceSessionActive && micListening);

        if (speakFinal) {

          setJarvisPending(false);

          setEqState('speaking');

          speakText(reply, () => {

            if (turnId !== turnRef.current) return;

            const s = useShellStore.getState();

            if (s.voiceSessionActive && s.micListening) {

              setEqState('listening');

            } else {

              setEqState('idle');

            }

          });

        } else {

          setJarvisPending(false);

          setEqState('idle');

        }

      } catch (err) {

        if (turnId !== turnRef.current) return;

        if ((err as Error).name === 'AbortError') return;

        const msg = `Error: ${(err as Error).message}`;

        addTranscript('jarvis', msg);

        setJarvisPending(false);

        const { voiceSessionActive: vs, micListening: ml } = useShellStore.getState();

        if (vs && ml) {

          setEqState('listening');

        } else {

          setEqState('idle');

        }

      } finally {

        if (activeChatAbort === chatAbort) {

          activeChatAbort = null;

        }

      }

    },

    [

      addTranscript,

      cancelTurn,

      navigateToApp,

      pathname,

      refreshSessions,

      setEqState,

      setHeardCaption,

      setJarvisPending,

      setJarvisSessionId,

    ],

  );



  return {

    sendMessage,

    cancelTurn,

    startNewConversation,

    loadConversation,

    refreshSessions,

    jarvisSessionId,

  };

}


