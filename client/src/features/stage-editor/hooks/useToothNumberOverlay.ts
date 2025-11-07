// hooks/useToothNumberOverlay.ts
import { useState } from 'react';


export const useToothNumberOverlay = (api: any) => {
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [cachedSegmentationData, setCachedSegmentationData] = useState<any>(null);
  
  const refreshImageWithOverlay = async (
    imageUrl: string,
    showOverlay: boolean,
    toothNumberingSystem: string,
    textSizeMultiplier: number,
    detections: any[],
    cachedData?: any
  ) => {
    if (!showOverlay) {
      return imageUrl;
    }
    
    try {
      const overlayResult = await api.addToothNumberOverlay(
        imageUrl,
        toothNumberingSystem,
        true,
        textSizeMultiplier,
        detections,
        cachedData
      );
      
      if (overlayResult && overlayResult.has_overlay) {
        if (overlayResult.segmentation_data && !cachedData) {
          console.log('💾 Caching segmentation data for future use');
          setCachedSegmentationData(overlayResult.segmentation_data);
        }
        return overlayResult.image_url;
      }
    } catch (error) {
      console.error('Failed to add tooth number overlay:', error);
    }
    
    return imageUrl;
  };
  
  const restoreOriginalImage = (
    currentImageUrl: string,
    originalUrl: string | null,
    setImageData: Function
  ) => {
    if (originalUrl && currentImageUrl !== originalUrl) {
      setImageData((prev: any) => ({
        ...prev,
        annotated_image_url: originalUrl
      }));
    }
  };
  
  return {
    originalImageUrl,
    setOriginalImageUrl,
    cachedSegmentationData,
    setCachedSegmentationData,
    refreshImageWithOverlay,
    restoreOriginalImage
  };
};