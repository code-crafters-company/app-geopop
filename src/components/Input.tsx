import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { colors, radius, spacing } from './theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, style, ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.primary}
          selectionColor={colors.primary}
          secureTextEntry={secureToggle ? !show : props.secureTextEntry}
          {...props}
        />
        {secureToggle && (
          <Pressable onPress={() => setShow((s) => !s)} style={styles.eyeBtn}>
            {show
              ? <Eye size={20} color={colors.textSecondary} />
              : <EyeSlash size={20} color={colors.textSecondary} />}
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputError: { borderColor: colors.error },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 50,
  },
  eyeBtn: { paddingHorizontal: spacing.lg },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
});
