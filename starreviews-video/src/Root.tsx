import React from 'react';
import { Composition } from 'remotion';
import { StarReviewsVideo } from './StarReviewsVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StarReviewsVideo"
      component={StarReviewsVideo}
      durationInFrames={900} // 30s @ 30fps
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
