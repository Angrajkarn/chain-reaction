// ============================================================
// AdBanner — Google AdMob Banner Ad component
// ============================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Ad Unit ID provided by the user. Falls back to AdMob Test Banner ID in development mode.
const AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : 'ca-app-pub-9490969329975402/9686704749';

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(err) => {
          if (__DEV__) {
            console.log('AdMob load failed: ', err);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
    minHeight: 50,
  },
});
