import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

const LOGO_GEOPOP = require('../../assets/images/logo-clara-wide.png');

export function AuthBrand({ name, logoUrl }: Props) {
  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <Image source={LOGO_GEOPOP} style={styles.logoGeopop} resizeMode="contain" accessibilityLabel="GeoPop" />
      )}
      {name ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.productName} numberOfLines={1}>{name}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  logoImage: { width: 112, height: 36 },
  logoGeopop: { width: 150, height: 58 },
  divider: { width: 1, height: 22, backgroundColor: '#D7DCE3', marginHorizontal: 12 },
  productName: { color: '#697386', fontSize: 12, fontWeight: '600', maxWidth: 110 },
});
