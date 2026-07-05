import React from 'react';
import { Composition } from 'remotion';
import { StarReviewsVideo } from './StarReviewsVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StarReviewsVideo"
      component={StarReviewsVideo}
      durationInFrames={1800} // 30s @ 60fps
      fps={60}
      width={1080}
      height={1920}
    />
  );
};
