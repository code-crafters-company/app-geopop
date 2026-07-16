import { Image, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'phosphor-react-native';

interface Props {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export function AuthBrand({ name = 'GeoPop', logoUrl, primaryColor }: Props) {
  const accent = primaryColor || '#E8B923';

  return (
    <View style={styles.container}>
      <View style={[styles.mark, { backgroundColor: accent }]}>
        <MapPin size={22} weight="fill" color="#18202D" />
      </View>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
      ) : (
        <View style={styles.wordmark}>
          <Text style={styles.logoText}>GEO</Text>
          <Text style={[styles.logoText, { color: accent }]}>POP</Text>
        </View>
      )}
      <View style={styles.divider} />
      <Text style={styles.productName} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#18202D', fontSize: 21, fontWeight: '900', letterSpacing: 1.2 },
  logoImage: { width: 112, height: 36 },
  divider: { width: 1, height: 22, backgroundColor: '#D7DCE3', marginHorizontal: 12 },
  productName: { color: '#697386', fontSize: 12, fontWeight: '600', maxWidth: 110 },
});
