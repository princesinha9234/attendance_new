import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardTypeOptions,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Card, Avatar, Badge } from '@/components';
import * as ImagePicker from 'expo-image-picker';

type FormField =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'employeeId'
  | 'department'
  | 'designation';

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
}

interface ProfileInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon: keyof typeof Ionicons.glyphMap;
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
}: ProfileInputProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          !editable && styles.inputDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={editable ? '#059669' : '#94A3B8'}
          style={styles.inputIcon}
        />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    employeeId: user?.teacherProfile?.employeeId || '',
    department: user?.teacherProfile?.department || '',
    designation: user?.teacherProfile?.designation || '',
  });

  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatarUrl || null
  );

  const updateField = (
    field: FormField,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const navigate = (path: string) => {
    router.push(path as Href<string>);
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to change your profile picture.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (!result.canceled && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);

      Alert.alert(
        'Error',
        'Unable to select an image.'
      );
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert(
        'Error',
        'User information is not available.'
      );
      return;
    }

    if (!formData.fullName.trim()) {
      Alert.alert(
        'Invalid Name',
        'Please enter your full name.'
      );
      return;
    }

    setSaving(true);

    try {
      const userUpdate: {
        fullName: string;
        phone: string;
        avatarUrl?: string;
      } = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      };

      if (avatarUri) {
        userUpdate.avatarUrl = avatarUri;
      }

      await api.updateUser(user.id, userUpdate);

      if (user.teacherProfile) {
        await api.updateUser(user.id, {
          department: formData.department.trim(),
          designation: formData.designation.trim(),
        });
      }

      updateUser({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        ...(avatarUri
          ? { avatarUrl: avatarUri }
          : {}),
      });

      setEditing(false);

      Alert.alert(
        'Success',
        'Profile updated successfully.'
      );
    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      handleSave();
    } else {
      setEditing(true);
    }
  };

  const handleFaceEnroll = () => {
    navigate('/face-enroll?mode=enroll');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            router.replace('/login');
          },
        },
      ]
    );
  };

  const teacherProfile = user?.teacherProfile;
  const institution = teacherProfile?.institution;

  const subjectCount =
    teacherProfile?.subjects?.length || 0;

  const isFaceEnrolled = Boolean(
    user?.faceDescriptor
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#059669', '#047857']}
        style={styles.headerGradient}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditToggle}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.editButtonText}>
              {saving
                ? 'Saving...'
                : editing
                ? 'Save'
                : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : undefined
              }
              name={
                formData.fullName ||
                user?.fullName ||
                'Teacher'
              }
              size="xl"
              style={styles.avatar}
            />

            {editing && (
              <TouchableOpacity
                style={styles.avatarEditButton}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="camera"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.profileName}>
            {formData.fullName ||
              user?.fullName ||
              'Teacher'}
          </Text>

          <Text style={styles.profileRole}>
            {teacherProfile?.designation ||
              'Teacher'}
            {teacherProfile?.department
              ? ` • ${teacherProfile.department}`
              : ''}
          </Text>

          {institution?.name ? (
            <Text style={styles.profileInstitution}>
              {institution.name}
            </Text>
          ) : null}

          <View style={styles.profileBadges}>
            {teacherProfile?.employeeId ? (
              <Badge
                variant="info"
                size="sm"
              >
                {teacherProfile.employeeId}
              </Badge>
            ) : null}

            <Badge
              variant="default"
              size="sm"
            >
              {subjectCount} Subjects
            </Badge>
          </View>
        </View>

        {/* Professional Information */}
        <Card
          style={styles.sectionCard}
          variant="elevated"
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="id-card"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Professional Information
            </Text>
          </View>

          <View style={styles.form}>
            <ProfileInput
              label="Employee ID"
              value={formData.employeeId}
              onChangeText={(value: string) =>
                updateField(
                  'employeeId',
                  value
                )
              }
              placeholder="Enter employee ID"
              icon="id-card"
              editable={editing}
            />

            <ProfileInput
              label="Full Name"
              value={formData.fullName}
              onChangeText={(value: string) =>
                updateField(
                  'fullName',
                  value
                )
              }
              placeholder="Enter full name"
              icon="person"
              editable={editing}
            />

            <ProfileInput
              label="Email"
              value={formData.email}
              onChangeText={(value: string) =>
                updateField(
                  'email',
                  value
                )
              }
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
              editable={false}
            />

            <ProfileInput
              label="Phone"
              value={formData.phone}
              onChangeText={(value: string) =>
                updateField(
                  'phone',
                  value
                )
              }
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              icon="call"
              editable={editing}
            />

            <ProfileInput
              label="Department"
              value={formData.department}
              onChangeText={(value: string) =>
                updateField(
                  'department',
                  value
                )
              }
              placeholder="e.g., Computer Science"
              icon="school"
              editable={editing}
            />

            <ProfileInput
              label="Designation"
              value={formData.designation}
              onChangeText={(value: string) =>
                updateField(
                  'designation',
                  value
                )
              }
              placeholder="e.g., Professor"
              icon="briefcase"
              editable={editing}
            />

            <ProfileInput
              label="Subjects"
              value={
                teacherProfile?.subjects?.join(
                  ', '
                ) || ''
              }
              onChangeText={() => {}}
              placeholder="e.g., CS301, CS302"
              icon="book"
              editable={false}
            />
          </View>
        </Card>

        {/* Face Verification */}
        <Card
          style={styles.sectionCard}
          variant="elevated"
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="shield-checkmark"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Face Verification
            </Text>
          </View>

          <View style={styles.faceSection}>
            <View style={styles.faceStatus}>
              <Ionicons
                name={
                  isFaceEnrolled
                    ? 'checkmark-circle'
                    : 'radio-button-off'
                }
                size={28}
                color={
                  isFaceEnrolled
                    ? '#10B981'
                    : '#94A3B8'
                }
              />

              <View
                style={styles.faceStatusText}
              >
                <Text
                  style={styles.faceStatusTitle}
                >
                  {isFaceEnrolled
                    ? 'Face Enrolled'
                    : 'Face Not Enrolled'}
                </Text>

                <Text
                  style={styles.faceStatusDesc}
                >
                  {isFaceEnrolled
                    ? 'Your face is enrolled for attendance verification'
                    : 'Enroll your face to use QR + Face attendance'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.faceButton,
                isFaceEnrolled
                  ? styles.faceButtonSecondary
                  : styles.faceButtonPrimary,
                !editing &&
                  styles.faceButtonDisabled,
              ]}
              onPress={handleFaceEnroll}
              disabled={!editing}
              activeOpacity={0.8}
            >
              <Ionicons
                name="scan-outline"
                size={20}
                color={
                  isFaceEnrolled
                    ? '#059669'
                    : '#FFFFFF'
                }
              />

              <Text
                style={[
                  styles.faceButtonText,
                  isFaceEnrolled
                    ? styles.faceButtonTextSecondary
                    : styles.faceButtonTextPrimary,
                ]}
              >
                {isFaceEnrolled
                  ? 'Re-enroll Face'
                  : 'Enroll Face'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Institution */}
        {institution && (
          <Card
            style={styles.sectionCard}
            variant="outlined"
            gradientColors={[
              '#ECFDF5',
              '#D1FAE5',
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons
                name="business"
                size={22}
                color="#059669"
              />

              <Text style={styles.sectionTitle}>
                Institution
              </Text>
            </View>

            <View style={styles.institutionInfo}>
              {(institution.address ||
                institution.city ||
                institution.state) && (
                <View
                  style={styles.institutionRow}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color="#059669"
                  />

                  <Text
                    style={styles.institutionText}
                  >
                    {[
                      institution.address,
                      institution.city,
                      institution.state,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              )}

              {institution.code && (
                <View
                  style={styles.institutionRow}
                >
                  <Ionicons
                    name="id-card"
                    size={20}
                    color="#059669"
                  />

                  <Text
                    style={styles.institutionText}
                  >
                    Code: {institution.code}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Account */}
        <Card
          style={styles.sectionCard}
          variant="outlined"
          gradientColors={[
            '#FEF2F2',
            '#FEE2E2',
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="log-out"
              size={22}
              color="#EF4444"
            />

            <Text
              style={[
                styles.sectionTitle,
                styles.dangerTitle,
              ]}
            >
              Account
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out"
              size={22}
              color="#EF4444"
            />

            <Text style={styles.logoutText}>
              Logout
            </Text>
          </TouchableOpacity>
        </Card>
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
    height: 150,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  editButton: {
    minWidth: 68,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  profileRole: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileInstitution: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  faceSection: {
    gap: 16,
  },
  faceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faceStatusText: {
    flex: 1,
    gap: 4,
  },
  faceStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  faceStatusDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  faceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  faceButtonPrimary: {
    backgroundColor: '#059669',
  },
  faceButtonSecondary: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  faceButtonDisabled: {
    opacity: 0.6,
  },
  faceButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  faceButtonTextPrimary: {
    color: '#FFFFFF',
  },
  faceButtonTextSecondary: {
    color: '#047857',
  },
  institutionInfo: {
    gap: 12,
  },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  institutionText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  dangerTitle: {
    color: '#DC2626',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});