import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import {
  useRouter,
  useLocalSearchParams,
} from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '@/services/api';
import { Card, Loading, Badge } from '@/components';
import { QRCode } from '@/components/QRCode';
import {
  formatDate,
  formatTime,
} from '@/utils/format';

interface InstructionRowProps {
  number: number;
  text: string;
}

interface Session {
  id: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  requireFaceVerify?: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  allowedRadius?: number;
  subjectClassMapping?: {
    subject?: {
      name?: string;
      code?: string;
    };
    class?: {
      name?: string;
    };
  };
}

interface QRResponseData {
  token?: string;
  qrCode?: string;
  expiresAt?: string;
}

const InstructionRow = ({
  number,
  text,
}: InstructionRowProps) => (
  <View style={styles.instructionRow}>
    <View style={styles.instructionNumber}>
      <Text style={styles.instructionNumberText}>
        {number}
      </Text>
    </View>

    <Text style={styles.instructionText}>
      {text}
    </Text>
  </View>
);

export default function QRDisplayScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      sessionId?: string | string[];
    }>();

  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  const [qrData, setQrData] = useState('');
  const [qrImage, setQrImage] = useState('');

  const [generating, setGenerating] =
    useState(true);

  const [session, setSession] =
    useState<Session | null>(null);

  const [expired, setExpired] =
    useState(false);

  const [timeRemaining, setTimeRemaining] =
    useState(0);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchSession = async () => {
    if (!sessionId) {
      Alert.alert(
        'Error',
        'Session ID is missing.'
      );
      return;
    }

    try {
      const response =
        await api.getSession(sessionId);

      if (response?.data) {
        setSession(response.data);
      }
    } catch (error) {
      console.error(
        'Fetch session error:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to load session.'
      );
    }
  };

  const generateQR = async () => {
    if (!sessionId) {
      Alert.alert(
        'Error',
        'Session ID is missing.'
      );
      return;
    }

    clearTimer();

    setGenerating(true);
    setExpired(false);
    setTimeRemaining(0);

    try {
      const response =
        await api.generateQR(sessionId);

      if (response?.error) {
        throw new Error(response.error);
      }

      const data =
        response?.data as
          | QRResponseData
          | undefined;

      setQrData(data?.token || '');
      setQrImage(data?.qrCode || '');

      if (data?.expiresAt) {
        const expiry =
          new Date(
            data.expiresAt
          ).getTime();

        const updateTimer = () => {
          const remaining = Math.max(
            0,
            Math.floor(
              (expiry - Date.now()) /
                1000
            )
          );

          setTimeRemaining(
            remaining
          );

          if (remaining <= 0) {
            setExpired(true);
            clearTimer();
          }
        };

        updateTimer();

        timerRef.current =
          setInterval(
            updateTimer,
            1000
          );
      } else {
        setTimeRemaining(0);
      }
    } catch (error) {
      console.error(
        'Generate QR error:',
        error
      );

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to generate QR code.'
      );

      setQrData('');
      setQrImage('');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    fetchSession();
    generateQR();

    return () => {
      clearTimer();
    };
  }, [sessionId]);

  const formatTimeRemaining = (
    seconds: number
  ) => {
    const mins = Math.floor(
      seconds / 60
    );

    const secs = seconds % 60;

    return `${mins}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleBack = () => {
    router.back();
  };

  const handleSessionDetails = () => {
    if (!sessionId) {
      return;
    }

    router.push(
      `/teacher/session-detail?id=${encodeURIComponent(sessionId)}` as any
    );
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            '#059669',
            '#047857',
          ]}
          style={styles.headerGradient}
        />

        <View style={styles.loadingHeader}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Attendance QR Code
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View
          style={
            styles.loadingContainer
          }
        >
          <Loading
            size="lg"
            text="Loading session..."
          />
        </View>
      </View>
    );
  }

  const subjectName =
    session.subjectClassMapping
      ?.subject?.name ||
    'Attendance Session';

  const className =
    session.subjectClassMapping
      ?.class?.name ||
    'Class';

  const subjectCode =
    session.subjectClassMapping
      ?.subject?.code ||
    '';

  const hasLocation =
    session.locationLat !== null &&
    session.locationLat !== undefined &&
    session.locationLng !== null &&
    session.locationLng !== undefined;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          '#059669',
          '#047857',
        ]}
        style={styles.headerGradient}
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Attendance QR Code
          </Text>

          <TouchableOpacity
            onPress={generateQR}
            style={styles.refreshButton}
            disabled={generating}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Session Information */}
        <Card
          style={styles.sessionCard}
          variant="gradient"
          gradientColors={[
            '#059669',
            '#047857',
          ]}
        >
          <View
            style={styles.sessionInfo}
          >
            <Text
              style={styles.sessionSubject}
            >
              {subjectName}
            </Text>

            <Text
              style={styles.sessionClass}
            >
              {className}
              {subjectCode
                ? ` • ${subjectCode}`
                : ''}
            </Text>

            <View
              style={styles.sessionMeta}
            >
              {session.scheduledStart && (
                <Text
                  style={
                    styles.sessionMetaText
                  }
                >
                  {formatDate(
                    session.scheduledStart
                  )}
                </Text>
              )}

              {session.scheduledStart &&
                session.scheduledEnd && (
                  <Text
                    style={
                      styles.sessionMetaText
                    }
                  >
                    {formatTime(
                      session.scheduledStart
                    )}{' '}
                    -{' '}
                    {formatTime(
                      session.scheduledEnd
                    )}
                  </Text>
                )}
            </View>

            <TouchableOpacity
              style={
                styles.detailsButton
              }
              onPress={
                handleSessionDetails
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.detailsButtonText
                }
              >
                View Session
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* QR Section */}
        <View
          style={styles.qrSection}
        >
          {generating ? (
            <Card
              style={styles.qrCard}
              variant="elevated"
            >
              <View
                style={
                  styles.loadingQrContainer
                }
              >
                <Loading
                  size="lg"
                  text="Generating QR Code..."
                  color="#059669"
                />
              </View>
            </Card>
          ) : expired ? (
            <Card
              style={styles.qrCard}
              variant="outlined"
              gradientColors={[
                '#FEF2F2',
                '#FEE2E2',
              ]}
            >
              <View
                style={
                  styles.expiredContent
                }
              >
                <Ionicons
                  name="time"
                  size={48}
                  color="#EF4444"
                />

                <Text
                  style={
                    styles.expiredTitle
                  }
                >
                  QR Code Expired
                </Text>

                <Text
                  style={
                    styles.expiredText
                  }
                >
                  The QR code has expired.
                  Generate a new one to
                  continue.
                </Text>

                <TouchableOpacity
                  style={
                    styles.dangerButton
                  }
                  onPress={generateQR}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.buttonText
                    }
                  >
                    Generate New QR
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <Card
              style={styles.qrCard}
              variant="elevated"
            >
              <View
                style={styles.qrContainer}
              >
                {/* QR Image */}
                <View
                  style={styles.qrFrame}
                >
                  {qrData ? (
                    <QRCode
                      value={qrData}
                      size={250}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  ) : (
                    <View
                      style={
                        styles.qrPlaceholder
                      }
                    >
                      <Ionicons
                        name="qr-code"
                        size={80}
                        color="#CBD5E1"
                      />

                      <Text
                        style={
                          styles.qrPlaceholderText
                        }
                      >
                        QR Code
                      </Text>
                    </View>
                  )}
                </View>

                {/* QR Status */}
                <View
                  style={styles.qrStatus}
                >
                  <Badge
                    variant="success"
                    size="sm"
                    dot
                  >
                    ACTIVE
                  </Badge>

                  <Text
                    style={
                      styles.timerText
                    }
                  >
                    {formatTimeRemaining(
                      timeRemaining
                    )}{' '}
                    remaining
                  </Text>
                </View>

                {/* Instructions */}
                <View
                  style={
                    styles.qrInstructions
                  }
                >
                  <Text
                    style={
                      styles.instructionTitle
                    }
                  >
                    Instructions for
                    Students:
                  </Text>

                  <InstructionRow
                    number={1}
                    text="Open the Attendance app"
                  />

                  <InstructionRow
                    number={2}
                    text="Tap 'Scan QR Code'"
                  />

                  <InstructionRow
                    number={3}
                    text="Scan this QR code"
                  />

                  <InstructionRow
                    number={4}
                    text="Verify face if required"
                  />

                  <InstructionRow
                    number={5}
                    text="Attendance marked!"
                  />
                </View>

                {/* Token */}
                {qrData ? (
                  <View
                    style={styles.qrDetails}
                  >
                    <Text
                      style={
                        styles.detailLabel
                      }
                    >
                      Session Token
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }
                      numberOfLines={1}
                    >
                      {qrData.length > 24
                        ? `${qrData.substring(
                            0,
                            24
                          )}...`
                        : qrData}
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View
                  style={styles.qrActions}
                >
                  <TouchableOpacity
                    style={
                      styles.outlineButton
                    }
                    onPress={
                      generateQR
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color="#059669"
                    />

                    <Text
                      style={
                        styles.outlineButtonText
                      }
                    >
                      Regenerate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.primaryButton
                    }
                    onPress={() =>
                      Alert.alert(
                        'Feature',
                        'Save to gallery coming soon.'
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Save QR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}

          {/* Face Verification */}
          {session.requireFaceVerify && (
            <Card
              style={styles.infoCard}
              variant="outlined"
              gradientColors={[
                '#FEF3C7',
                '#FDE68A',
              ]}
            >
              <View
                style={styles.infoRow}
              >
                <View
                  style={
                    styles.infoIconContainer
                  }
                >
                  <Ionicons
                    name="scan-outline"
                    size={24}
                    color="#F59E0B"
                  />
                </View>

                <View
                  style={styles.infoText}
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    Face Verification
                    Required
                  </Text>

                  <Text
                    style={
                      styles.infoDesc
                    }
                  >
                    Students must verify
                    their face after
                    scanning the QR code.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Geofencing */}
          {hasLocation && (
            <Card
              style={styles.infoCard}
              variant="outlined"
              gradientColors={[
                '#DBEAFE',
                '#BFDBFE',
              ]}
            >
              <View
                style={styles.infoRow}
              >
                <View
                  style={
                    styles.infoIconContainer
                  }
                >
                  <Ionicons
                    name="location"
                    size={24}
                    color="#2563EB"
                  />
                </View>

                <View
                  style={styles.infoText}
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    Geofencing Active
                  </Text>

                  <Text
                    style={
                      styles.infoDesc
                    }
                  >
                    Students must be
                    within{' '}
                    {session.allowedRadius ||
                      0}
                    m of the classroom.
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 15,
  },

  headerSpacer: {
    width: 44,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sessionCard: {
    width: '100%',
    padding: 20,
    marginBottom: 20,
  },

  sessionInfo: {
    alignItems: 'center',
  },

  sessionSubject: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  sessionClass: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
  },

  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  sessionMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  detailsButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor:
      'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  qrSection: {
    gap: 16,
  },

  qrCard: {
    width: '100%',
    padding: 24,
  },

  loadingQrContainer: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrContainer: {
    alignItems: 'center',
  },

  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  qrPlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrPlaceholderText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 14,
  },

  qrStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },

  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'monospace',
  },

  qrInstructions: {
    width: '100%',
    gap: 10,
    marginTop: 22,
  },

  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },

  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  instructionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },

  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },

  qrDetails: {
    width: '100%',
    paddingTop: 18,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    gap: 5,
  },

  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },

  detailValue: {
    maxWidth: '100%',
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'monospace',
  },

  qrActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  outlineButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  outlineButtonText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },

  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  dangerButton: {
    width: '80%',
    minHeight: 46,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  expiredContent: {
    alignItems: 'center',
    paddingVertical: 25,
  },

  expiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },

  expiredText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },

  infoCard: {
    width: '100%',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  infoDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
});