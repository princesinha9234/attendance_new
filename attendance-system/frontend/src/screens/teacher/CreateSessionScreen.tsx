import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

interface SubjectMapping {
  id: string;
  subject?: {
    name?: string;
    code?: string;
  };
  class?: {
    name?: string;
  };
}

interface FormData {
  subjectClassMappingId: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationLat: string;
  locationLng: string;
  allowedRadius: string;
  requireFaceVerify: boolean;
}

export default function CreateSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getToday();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [subjectMappings, setSubjectMappings] = useState<
    SubjectMapping[]
  >([]);

  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");

  const [formData, setFormData] = useState<FormData>({
    subjectClassMappingId: "",
    scheduledStart: today,
    scheduledEnd: today,
    locationLat: "",
    locationLng: "",
    allowedRadius: "50",
    requireFaceVerify: true,
  });

  const fetchSubjectMappings = async () => {
    try {
      if (!user?.teacherProfile?.id) {
        setLoading(false);
        return;
      }

      /*
       * The current API does not appear to expose a dedicated
       * subject-class-mapping endpoint, so the existing mock
       * mappings are retained for now.
       */
      await api.getSessions({ limit: 1 });

      setSubjectMappings([
        {
          id: "1",
          subject: {
            name: "Database Management Systems",
            code: "CS301",
          },
          class: {
            name: "CSE-3A",
          },
        },
        {
          id: "2",
          subject: {
            name: "Operating Systems",
            code: "CS302",
          },
          class: {
            name: "CSE-3A",
          },
        },
        {
          id: "3",
          subject: {
            name: "Computer Networks",
            code: "CS401",
          },
          class: {
            name: "CSE-3B",
          },
        },
      ]);
    } catch (error) {
      console.error("Fetch mappings error:", error);

      Alert.alert(
        "Error",
        "Unable to load subject and class information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectMappings();
  }, [user]);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const combineDateTime = (
    dateStr: string,
    timeStr: string
  ) => {
    const [year, month, day] = dateStr
      .split("-")
      .map(Number);

    const [hours, minutes] = timeStr
      .split(":")
      .map(Number);

    const dateObject = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0
    );

    return dateObject.toISOString();
  };

  const validateDate = (value: string) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    if (!regex.test(value)) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00`);

    return !Number.isNaN(parsed.getTime());
  };

  const validateTime = (value: string) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    return regex.test(value);
  };

  const handleCreate = async () => {
    if (!formData.subjectClassMappingId) {
      Alert.alert(
        "Error",
        "Please select a subject and class."
      );
      return;
    }

    if (!validateDate(date)) {
      Alert.alert(
        "Error",
        "Please enter a valid date in YYYY-MM-DD format."
      );
      return;
    }

    if (!validateTime(startTime)) {
      Alert.alert(
        "Error",
        "Please enter a valid start time in HH:MM format."
      );
      return;
    }

    if (!validateTime(endTime)) {
      Alert.alert(
        "Error",
        "Please enter a valid end time in HH:MM format."
      );
      return;
    }

    const scheduledStart = combineDateTime(
      date,
      startTime
    );

    const scheduledEnd = combineDateTime(
      date,
      endTime
    );

    if (
      new Date(scheduledStart).getTime() >=
      new Date(scheduledEnd).getTime()
    ) {
      Alert.alert(
        "Error",
        "End time must be after start time."
      );
      return;
    }

    if (
      formData.locationLat &&
      Number.isNaN(Number(formData.locationLat))
    ) {
      Alert.alert(
        "Error",
        "Latitude must be a valid number."
      );
      return;
    }

    if (
      formData.locationLng &&
      Number.isNaN(Number(formData.locationLng))
    ) {
      Alert.alert(
        "Error",
        "Longitude must be a valid number."
      );
      return;
    }

    const radius = parseFloat(
      formData.allowedRadius
    );

    if (Number.isNaN(radius) || radius <= 0) {
      Alert.alert(
        "Error",
        "Allowed radius must be greater than 0."
      );
      return;
    }

    setCreating(true);

    try {
      const response = await api.createSession({
        subjectClassMappingId:
          formData.subjectClassMappingId,

        scheduledStart,

        scheduledEnd,

        locationLat: formData.locationLat
          ? parseFloat(formData.locationLat)
          : undefined,

        locationLng: formData.locationLng
          ? parseFloat(formData.locationLng)
          : undefined,

        allowedRadius: radius,

        requireFaceVerify:
          formData.requireFaceVerify,
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      Alert.alert(
        "Success",
        "Session created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Create session error:", error);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create session."
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedMapping =
    subjectMappings.find(
      (mapping) =>
        mapping.id ===
        formData.subjectClassMappingId
    );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#059669", "#047857"]}
        style={styles.headerGradient}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Create Session
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Subject & Class */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="school"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Subject & Class
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            Select Subject & Class
          </Text>

          <View style={styles.selectedInput}>
            <Ionicons
              name="layers"
              size={20}
              color="#64748B"
            />

            <Text
              style={[
                styles.selectedInputText,
                !selectedMapping &&
                  styles.placeholderText,
              ]}
            >
              {selectedMapping
                ? `${selectedMapping.subject?.name || "Subject"} - ${
                    selectedMapping.class?.name ||
                    "Class"
                  }`
                : "Choose subject and class"}
            </Text>
          </View>

          <View style={styles.mappingOptions}>
            {subjectMappings.map((mapping) => {
              const isSelected =
                formData.subjectClassMappingId ===
                mapping.id;

              return (
                <TouchableOpacity
                  key={mapping.id}
                  style={[
                    styles.mappingOption,
                    isSelected &&
                      styles.mappingOptionSelected,
                  ]}
                  onPress={() =>
                    updateField(
                      "subjectClassMappingId",
                      mapping.id
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.mappingInfo}>
                    <Text
                      style={styles.mappingSubject}
                    >
                      {mapping.subject?.name ||
                        "Unknown Subject"}{" "}
                      {mapping.subject?.code
                        ? `(${mapping.subject.code})`
                        : ""}
                    </Text>

                    <Text
                      style={styles.mappingClass}
                    >
                      {mapping.class?.name ||
                        "Unknown Class"}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      isSelected
                        ? "checkmark-circle"
                        : "radio-button-off"
                    }
                    size={24}
                    color={
                      isSelected
                        ? "#059669"
                        : "#94A3B8"
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date & Time */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="time"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Date & Time
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            Date
          </Text>

          <View style={styles.textInputContainer}>
            <Ionicons
              name="calendar"
              size={20}
              color="#64748B"
            />

            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={(value) => {
                setDate(value);

                updateField(
                  "scheduledStart",
                  value
                );

                updateField(
                  "scheduledEnd",
                  value
                );
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.inputLabel}>
                Start Time
              </Text>

              <View style={styles.textInputContainer}>
                <Ionicons
                  name="time"
                  size={20}
                  color="#64748B"
                />

                <TextInput
                  style={styles.textInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.timeInputWrapper}>
              <Text style={styles.inputLabel}>
                End Time
              </Text>

              <View style={styles.textInputContainer}>
                <Ionicons
                  name="time"
                  size={20}
                  color="#64748B"
                />

                <TextInput
                  style={styles.textInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:30"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          <Text style={styles.helperText}>
            Date format: YYYY-MM-DD · Time format:
            HH:MM
          </Text>
        </View>

        {/* Location */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="location"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Location (Geofencing)
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            Latitude (Optional)
          </Text>

          <View style={styles.textInputContainer}>
            <Ionicons
              name="navigate"
              size={20}
              color="#64748B"
            />

            <TextInput
              style={styles.textInput}
              value={formData.locationLat}
              onChangeText={(value) =>
                updateField(
                  "locationLat",
                  value
                )
              }
              placeholder="e.g., 12.9716"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.inputLabel}>
            Longitude (Optional)
          </Text>

          <View style={styles.textInputContainer}>
            <Ionicons
              name="navigate"
              size={20}
              color="#64748B"
            />

            <TextInput
              style={styles.textInput}
              value={formData.locationLng}
              onChangeText={(value) =>
                updateField(
                  "locationLng",
                  value
                )
              }
              placeholder="e.g., 77.5946"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.inputLabel}>
            Allowed Radius (meters)
          </Text>

          <View style={styles.textInputContainer}>
            <Ionicons
              name="radio"
              size={20}
              color="#64748B"
            />

            <TextInput
              style={styles.textInput}
              value={formData.allowedRadius}
              onChangeText={(value) =>
                updateField(
                  "allowedRadius",
                  value
                )
              }
              placeholder="50"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.helperText}>
            Students within this radius can mark
            attendance.
          </Text>

          <View style={styles.helpText}>
            <Ionicons
              name="information-circle"
              size={18}
              color="#166534"
            />

            <Text
              style={styles.helpTextContent}
            >
              Leave location empty to disable
              geofencing. Students can then mark
              attendance from anywhere.
            </Text>
          </View>
        </View>

        {/* Verification Settings */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="shield-checkmark"
              size={22}
              color="#059669"
            />

            <Text style={styles.sectionTitle}>
              Verification Settings
            </Text>
          </View>

          <View
            style={[
              styles.toggleRow,
              formData.requireFaceVerify &&
                styles.toggleRowActive,
            ]}
          >
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>
                Require Face Verification
              </Text>

              <Text style={styles.toggleDesc}>
                Students must verify their face
                after scanning QR.
              </Text>
            </View>

            <Switch
              value={formData.requireFaceVerify}
              onValueChange={(value) =>
                updateField(
                  "requireFaceVerify",
                  value
                )
              }
              trackColor={{
                false: "#CBD5E1",
                true: "#6EE7B7",
              }}
              thumbColor={
                formData.requireFaceVerify
                  ? "#059669"
                  : "#F8FAFC"
              }
            />
          </View>
        </View>

        {/* Buttons */}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              creating &&
                styles.primaryButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <Text
                style={styles.primaryButtonText}
              >
                Creating...
              </Text>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Create Session
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.back()}
            disabled={creating}
            activeOpacity={0.8}
          >
            <Text
              style={styles.outlineButtonText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  loadingText: {
    fontSize: 16,
    color: "#64748B",
  },

  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 125,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  headerSpacer: {
    width: 44,
  },

  sectionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 10,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 7,
    marginTop: 10,
  },

  selectedInput: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
  },

  selectedInputText: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    marginLeft: 10,
  },

  placeholderText: {
    color: "#94A3B8",
  },

  mappingOptions: {
    marginTop: 12,
  },

  mappingOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },

  mappingOptionSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#059669",
  },

  mappingInfo: {
    flex: 1,
    paddingRight: 10,
  },

  mappingSubject: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },

  mappingClass: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },

  textInputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },

  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    marginLeft: 10,
    paddingVertical: 10,
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeInputWrapper: {
    flex: 1,
  },

  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 18,
  },

  helpText: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
  },

  helpTextContent: {
    flex: 1,
    fontSize: 13,
    color: "#166534",
    lineHeight: 19,
    marginLeft: 8,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },

  toggleRowActive: {
    backgroundColor: "#ECFDF5",
  },

  toggleText: {
    flex: 1,
    paddingRight: 12,
  },

  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },

  toggleDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },

  buttonContainer: {
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  outlineButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  outlineButtonText: {
    color: "#059669",
    fontSize: 15,
    fontWeight: "600",
  },
});