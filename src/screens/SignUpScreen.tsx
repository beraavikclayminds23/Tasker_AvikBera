import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation';
import { useTheme } from '../hooks/theme';

// Vector Icons
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

const BRAND = '#2E5BFF';
const BRAND_DARK = '#1A3FCC';

// ── Password strength bar ────────────────────────────────────────────────────
const getStrength = (pw: string): { level: number; label: string; color: string } => {
  if (pw.length === 0) return { level: 0, label: '', color: 'transparent' };
  if (pw.length < 6) return { level: 1, label: 'Weak', color: '#FF4D4F' };
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return { level: 2, label: 'Fair', color: '#FAAD14' };
  if (!/[^A-Za-z0-9]/.test(pw)) return { level: 3, label: 'Good', color: '#52C41A' };
  return { level: 4, label: 'Strong', color: '#2E5BFF' };
};

const StrengthBar = ({ password, isDark }: { password: string; isDark: boolean }) => {
  const { level, label, color } = getStrength(password);
  const trackColor = isDark ? '#2C2C2C' : '#E8EAF6';
  if (level === 0) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= level ? color : trackColor,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color, fontWeight: '600', marginTop: 4 }}>{label}</Text>
    </View>
  );
};

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const theme = useTheme();
  const isDark = theme.background === '#121212';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-30)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoSlide, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]),
      Animated.spring(cardSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
      Animated.timing(bottomFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2400, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2400, useNativeDriver: false }),
      ])
    ).start();
  }, [bottomFade, cardSlide, fadeAnim, glowAnim, logoSlide]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.20] });

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Your passwords do not match.');
      return;
    }
    if (getStrength(password).level < 2) {
      Alert.alert('Weak Password', 'Please choose a stronger password.');
      return;
    }

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Account Created!', 'Welcome aboard 🎉');
    } catch (error: any) {
      console.error(error);
      let msg = 'Something went wrong. Please try again.';
      if (error.code === 'auth/email-already-in-use') msg = 'That email address is already in use.';
      if (error.code === 'auth/invalid-email') msg = 'That email address is invalid.';
      if (error.code === 'auth/weak-password') msg = 'Password is too weak.';
      Alert.alert('Sign Up Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Derived colours
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#252528' : '#F5F8FF';
  const labelClr = isDark ? '#8A8FA8' : '#64748B';
  const divClr = isDark ? '#252528' : '#EEF2FF';
  const borderClr = isDark ? '#2C2C2C' : '#E2E8F0';
  const iconClr = labelClr;

  // Password match indicator
  const pwMatch = confirmPassword.length > 0 && password === confirmPassword;
  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Decorative blobs */}
      <Animated.View style={[styles.blob1, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.blob2, { opacity: glowOpacity }]} />

      {/* Back button */}
      <Animated.View style={[styles.backRow, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? '#252528' : '#F0F3FF', borderColor: isDark ? '#333' : '#E0E7FF' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <View style={[styles.backArrow, { borderColor: isDark ? '#aaa' : BRAND }]} />
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: logoSlide }] }]}>
            <View>
              <Image source={require('../../assets/TaskerImg.png')} style={styles.logoInner} />
            </View>
            <Text style={[styles.headline, { color: theme.text }]}>Create account</Text>
            <Text style={[styles.subline, { color: labelClr }]}>Sign up to get started</Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                opacity: fadeAnim,
                transform: [{ translateY: cardSlide }],
                borderColor: isDark ? '#252528' : '#EEF1FB',
              },
            ]}
          >
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: labelClr }]}>EMAIL</Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: borderClr }]}>
                <Icon name="email" size={22} color={iconClr} style={styles.icon} />
                <TextInput
                  style={[styles.tInput, { color: theme.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: labelClr }]}>PASSWORD</Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: borderClr }]}>
                <Icon name="lock" size={22} color={iconClr} style={styles.icon} />
                <TextInput
                  style={[styles.tInput, { color: theme.text }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={22}
                    color={iconClr}
                  />
                </TouchableOpacity>
              </View>
              <StrengthBar password={password} isDark={isDark} />
            </View>

            {/* Confirm Password */}
            <View style={[styles.fieldGroup, { marginBottom: 6 }]}>
              <Text style={[styles.label, { color: labelClr }]}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderColor: pwMismatch ? '#FF4D4F' : pwMatch ? '#52C41A' : borderClr,
                  },
                ]}
              >
                <Icon
                  name="lock"
                  size={22}
                  color={pwMismatch ? '#FF4D4F' : pwMatch ? '#52C41A' : iconClr}
                  style={styles.icon}
                />
                <TextInput
                  style={[styles.tInput, { color: theme.text }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(v => !v)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye' : 'eye-off'}
                    size={22}
                    color={pwMismatch ? '#FF4D4F' : pwMatch ? '#52C41A' : iconClr}
                  />
                </TouchableOpacity>
              </View>
              {pwMismatch && <Text style={styles.matchHint}>Passwords don't match</Text>}
              {pwMatch && <Text style={[styles.matchHint, { color: '#52C41A' }]}>Passwords match ✓</Text>}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: divClr, marginTop: 16 }]} />

            {/* CTA */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.btn, { opacity: loading ? 0.8 : 1 }]}
                onPress={handleSignUp}
                activeOpacity={0.88}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* ── Login link ── */}
          <Animated.View style={[styles.loginRow, { opacity: bottomFade }]}>
            <Text style={[styles.loginNote, { color: labelClr }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { color: BRAND }]}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  kav: { flex: 1 },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },

  // Blobs
  blob1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: BRAND,
    top: -100,
    right: -110,
  },
  blob2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: BRAND_DARK,
    bottom: -70,
    left: -90,
  },

  // Back button
  backRow: {
    position: 'absolute',
    top: 56,
    left: 24,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },

  // Header
  header: { alignItems: 'center', marginBottom: 28, marginTop: 40 },

  logoBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 5,
  },
  subline: { fontSize: 15, fontWeight: '400' },

  // Card
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },

  // Fields
  fieldGroup: { marginBottom: 16 },

  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 52,
  },

  icon: {
    marginRight: 12,
  },

  tInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },

  matchHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF4D4F',
    marginTop: 5,
    marginLeft: 2,
  },

  divider: { height: 1, marginBottom: 20 },

  // Button
  btn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Login row
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 8,
  },
  loginNote: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});

export default SignUpScreen;