"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useChatStore } from "@/stores/chat-store";

interface TypeEffectProps {
  text: string;
  speed?: number;
  chatId?: string;
}

export default function TypeEffect({
  text,
  speed = 15,
  chatId,
}: TypeEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const rawText = typeof text === "string" ? text : "";
  const setIsTypingEffect = useChatStore((s) => s.setIsTypingEffect);
  const setIsTyping = useChatStore((s) => s.setIsTyping);

  const currentIndexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => setDisplayedText(""));
    currentIndexRef.current = 0;
    startTimeRef.current = Date.now();
    setIsTypingEffect(chatId || "new", true);

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || now);

      let targetIndex = Math.floor(elapsed / speed);

      if (targetIndex > rawText.length) {
        targetIndex = rawText.length;
      }

      if (targetIndex > currentIndexRef.current) {
        let newIndex = targetIndex;
        const currentSlice = rawText.slice(0, newIndex);

        const lastCodeStart = currentSlice.lastIndexOf("```");
        const lastCodeEnd = currentSlice.lastIndexOf("```", lastCodeStart - 1);

        if (
          lastCodeStart !== -1 &&
          (lastCodeStart > lastCodeEnd || lastCodeEnd === -1)
        ) {
          const nextEnd = rawText.indexOf("```", lastCodeStart + 3);
          if (nextEnd !== -1 && nextEnd + 3 > newIndex) {
            newIndex = nextEnd + 3;
          }
        }

        setDisplayedText(rawText.slice(0, newIndex));
        currentIndexRef.current = newIndex;
      }

      if (currentIndexRef.current < rawText.length) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsTypingEffect(chatId || "new", false);
        setIsTyping(false);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setIsTypingEffect(chatId || "new", false);
      setIsTyping(false);
    };
  }, [rawText, speed, chatId, setIsTypingEffect, setIsTyping]);

  const renderedContent = useMemo(() => {
    return (
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {displayedText}
      </Markdown>
    );
  }, [displayedText]);

  return <div className="markdown-render-area">{renderedContent}</div>;
}
