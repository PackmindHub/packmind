import React, { useState, useEffect } from 'react';
import { PMText } from '@packmind/ui';

interface RotatingWordProps {
  words: readonly string[];
  interval?: number;
}

export const RotatingWord: React.FC<RotatingWordProps> = ({
  words,
  interval = 2000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
        setFade(true);
      }, 150);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <PMText
      as="span"
      display="inline-block"
      opacity={fade ? 1 : 0}
      transition="opacity 0.3s ease-in-out"
      fontWeight="bold"
    >
      {words[currentIndex]}
    </PMText>
  );
};
