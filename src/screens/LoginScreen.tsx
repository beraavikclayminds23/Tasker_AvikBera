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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
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

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const { width } = Dimensions.get('window');

const BRAND = '#2E5BFF';
const BRAND_DARK = '#1A3FCC';

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const theme = useTheme();
  const isDark = theme.background === '#121212';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-30)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoSlide, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]),
      Animated.spring(cardSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
      Animated.timing(bottomFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Soft pulsing glow on blobs
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2400, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2400, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.20] });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      console.error(error);
      let msg = 'Something went wrong. Please try again.';
      if (error.code === 'auth/invalid-email') msg = 'That email address is invalid.';
      if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Derived colours from theme
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#252528' : '#F5F8FF';
  const labelClr = isDark ? '#8A8FA8' : '#64748B';
  const divClr = isDark ? '#252528' : '#EEF2FF';
  const borderClr = isDark ? '#2C2C2C' : '#E2E8F0';
  const iconClr = labelClr;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Decorative blobs */}
      <Animated.View style={[styles.blob1, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.blob2, { opacity: glowOpacity }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.kav}>
          {/* ── Logo ── */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: logoSlide }] },
            ]}
          >
            {/* You can keep your image logo or replace with vector if desired */}
            <View>
              <Image source={require('../../assets/TaskerImg.png')} style={styles.logoInner} />
            </View>
            <Text style={[styles.headline, { color: theme.text }]}>Welcome back</Text>
            <Text style={[styles.subline, { color: labelClr }]}>Sign in to your account</Text>
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
            {/* Email field */}
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
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password field */}
            <View style={[styles.fieldGroup, { marginBottom: 6 }]}>
              <Text style={[styles.label, { color: labelClr }]}>PASSWORD</Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: borderClr }]}>
                <Icon name="lock" size={22} color={iconClr} style={styles.icon} />
                <TextInput
                  style={[styles.tInput, { color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#555' : '#A8B4C8'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
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
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: BRAND }]}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: divClr }]} />

            {/* CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.btn, { opacity: loading ? 0.8 : 1 }]}
                onPress={handleLogin}
                activeOpacity={0.88}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* ── Sign-up ── */}
          <Animated.View style={[styles.signupRow, { opacity: bottomFade }]}>
            <Text style={[styles.signupNote, { color: labelClr }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
              <Text style={[styles.signupLink, { color: BRAND }]}>Create one</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  kav: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
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

  // Header
  header: { alignItems: 'center', marginBottom: 28 },

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
  subline: {
    fontSize: 15,
    fontWeight: '400',
  },

  // Card
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.10,
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

  forgotRow: { alignSelf: 'flex-end', marginBottom: 18, marginTop: 2 },
  forgotText: { fontSize: 13, fontWeight: '600' },

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
    shadowOpacity: 0.50,
    shadowRadius: 16,
    elevation: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Sign-up
  signupRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 26,
    
  },
  signupNote: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '700', textAlign:"center", },
});

export default LoginScreen;