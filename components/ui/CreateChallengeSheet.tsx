import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface CreateChallengeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateChallengeSheet({
  visible,
  onClose,
  onSuccess,
}: CreateChallengeSheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days
    target_value: '',
    unit: '',
    rules: ['', '', ''],
    rewards: [
      { place: 1, title: '1st Place', reward: '' },
      { place: 2, title: '2nd Place', reward: '' },
      { place: 3, title: '3rd Place', reward: '' },
    ],
    status: 'upcoming',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!form.title.trim()) throw new Error('Title is required');
      if (!form.subtitle.trim()) throw new Error('Subtitle is required');
      if (!form.description.trim()) throw new Error('Description is required');
      if (!form.target_value) throw new Error('Target value is required');
      if (!form.unit.trim()) throw new Error('Unit is required');
      if (form.end_date <= form.start_date)
        throw new Error('End date must be after start date');

      // Filter out empty rules
      const rules = form.rules.filter(rule => rule.trim());
      if (rules.length === 0) throw new Error('At least one rule is required');

      // Filter out empty rewards
      const rewards = form.rewards.filter(reward => reward.reward.trim());
      if (rewards.length === 0) throw new Error('At least one reward is required');

      // Create challenge
      const { error: createError } = await supabase.from('challenges').insert({
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        start_date: form.start_date.toISOString(),
        end_date: form.end_date.toISOString(),
        target_value: parseInt(form.target_value),
        unit: form.unit.trim(),
        rules: rules,
        rewards: rewards,
        status: form.status,
      });

      if (createError) throw createError;

      // Reset form
      setForm({
        title: '',
        subtitle: '',
        description: '',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        target_value: '',
        unit: '',
        rules: ['', '', ''],
        rewards: [
          { place: 1, title: '1st Place', reward: '' },
          { place: 2, title: '2nd Place', reward: '' },
          { place: 3, title: '3rd Place', reward: '' },
        ],
        status: 'upcoming',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      setError(error.message || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Challenge</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Challenge Title</Text>
                  <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    placeholder="Enter challenge title"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subtitle</Text>
                  <TextInput
                    style={styles.input}
                    value={form.subtitle}
                    onChangeText={(text) => setForm({ ...form, subtitle: text })}
                    placeholder="Brief description (e.g., '30 Day Running Challenge')"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.description}
                    onChangeText={(text) =>
                      setForm({ ...form, description: text })
                    }
                    placeholder="Detailed description of the challenge"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Target</Text>
                  <View style={styles.targetContainer}>
                    <TextInput
                      style={[styles.input, styles.targetInput]}
                      value={form.target_value}
                      onChangeText={(text) =>
                        setForm({ ...form, target_value: text.replace(/[^0-9]/g, '') })
                      }
                      placeholder="Value"
                      placeholderTextColor="#666666"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, styles.unitInput]}
                      value={form.unit}
                      onChangeText={(text) => setForm({ ...form, unit: text })}
                      placeholder="Unit (km, reps, etc.)"
                      placeholderTextColor="#666666"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date Range</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={20}
                      color="#b0fb50"
                    />
                    <Text style={styles.dateButtonText}>
                      Starts: {form.start_date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <MaterialCommunityIcons
                      name="calendar-end"
                      size={20}
                      color="#b0fb50"
                    />
                    <Text style={styles.dateButtonText}>
                      Ends: {form.end_date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <DateTimePickerModal
                    isVisible={showStartDatePicker}
                    mode="date"
                    onConfirm={(date) => {
                      setShowStartDatePicker(false);
                      setForm({ ...form, start_date: date });
                    }}
                    onCancel={() => setShowStartDatePicker(false)}
                    date={form.start_date}
                  />

                  <DateTimePickerModal
                    isVisible={showEndDatePicker}
                    mode="date"
                    onConfirm={(date) => {
                      setShowEndDatePicker(false);
                      setForm({ ...form, end_date: date });
                    }}
                    onCancel={() => setShowEndDatePicker(false)}
                    date={form.end_date}
                    minimumDate={form.start_date}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rules</Text>
                  {form.rules.map((rule, index) => (
                    <TextInput
                      key={index}
                      style={styles.input}
                      value={rule}
                      onChangeText={(text) => {
                        const newRules = [...form.rules];
                        newRules[index] = text;
                        setForm({ ...form, rules: newRules });
                      }}
                      placeholder={`Rule ${index + 1}`}
                      placeholderTextColor="#666666"
                    />
                  ))}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Rewards</Text>
                  {form.rewards.map((reward, index) => (
                    <View key={index} style={styles.rewardInput}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <TextInput
                        style={styles.input}
                        value={reward.reward}
                        onChangeText={(text) => {
                          const newRewards = [...form.rewards];
                          newRewards[index].reward = text;
                          setForm({ ...form, rewards: newRewards });
                        }}
                        placeholder="Enter reward"
                        placeholderTextColor="#666666"
                      />
                    </View>
                  ))}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Challenge</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  targetContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  targetInput: {
    flex: 1,
  },
  unitInput: {
    flex: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  rewardInput: {
    gap: 4,
  },
  rewardTitle: {
    fontSize: 14,
    color: '#b0fb50',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});