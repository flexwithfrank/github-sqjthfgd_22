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

interface AddActivitySheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddActivitySheet({ visible, onClose, onSuccess }: AddActivitySheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    activity_date: new Date(),
    start_time: new Date(),
    duration_minutes: '60',
    fitness_studio: '',
    trainer: '',
    notes: '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate inputs
      if (!form.title.trim()) {
        setError('Title is required');
        return;
      }

      if (isNaN(parseInt(form.duration_minutes)) || parseInt(form.duration_minutes) <= 0) {
        setError('Duration must be a positive number');
        return;
      }

      // Format date as YYYY-MM-DD
      const formattedDate = form.activity_date.toISOString().split('T')[0];

      // Format time as HH:mm in 24-hour format
      const hours = form.start_time.getHours().toString().padStart(2, '0');
      const minutes = form.start_time.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;

      console.log('Submitting activity:', {
        date: formattedDate,
        time: formattedTime
      });

      // Create activity
      const { error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          activity_date: formattedDate,
          start_time: formattedTime,
          duration_minutes: parseInt(form.duration_minutes),
          fitness_studio: form.fitness_studio.trim(),
          trainer: form.trainer.trim(),
          notes: form.notes.trim(),
        });

      if (insertError) throw insertError;

      // Reset form
      setForm({
        title: '',
        subtitle: '',
        activity_date: new Date(),
        start_time: new Date(),
        duration_minutes: '60',
        fitness_studio: '',
        trainer: '',
        notes: '',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error adding activity:', error);
      setError(error.message || 'Failed to add activity');
    } finally {
      setLoading(false);
    }
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date: Date) => {
    // Keep the current time when changing the date
    const newDate = new Date(date);
    newDate.setHours(form.start_time.getHours());
    newDate.setMinutes(form.start_time.getMinutes());
    
    setForm(prev => ({ 
      ...prev, 
      activity_date: date,
      start_time: newDate
    }));
    hideDatePicker();
  };

  const showTimePicker = () => {
    setTimePickerVisibility(true);
  };

  const hideTimePicker = () => {
    setTimePickerVisibility(false);
  };

  const handleConfirmTime = (time: Date) => {
    // Keep the current date when changing the time
    const newTime = new Date(form.activity_date);
    newTime.setHours(time.getHours());
    newTime.setMinutes(time.getMinutes());
    
    setForm(prev => ({ 
      ...prev, 
      start_time: newTime
    }));
    hideTimePicker();
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
              <Text style={styles.title}>Add Activity</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Activity Title</Text>
                  <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                    placeholder="Enter activity title"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subtitle (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.subtitle}
                    onChangeText={(text) => setForm(prev => ({ ...prev, subtitle: text }))}
                    placeholder="Add subtitle"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={showDatePicker}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color="#b0fb50" />
                    <Text style={styles.dateButtonText}>
                      {form.activity_date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={showTimePicker}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#b0fb50" />
                    <Text style={styles.dateButtonText}>
                      {form.start_time.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.duration_minutes}
                    onChangeText={(text) => setForm(prev => ({ ...prev, duration_minutes: text }))}
                    keyboardType="number-pad"
                    placeholder="Enter duration in minutes"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fitness Studio (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.fitness_studio}
                    onChangeText={(text) => setForm(prev => ({ ...prev, fitness_studio: text }))}
                    placeholder="Enter fitness studio name"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Trainer (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.trainer}
                    onChangeText={(text) => setForm(prev => ({ ...prev, trainer: text }))}
                    placeholder="Enter trainer name"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.notes}
                    onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                    placeholder="Add any additional notes"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Activity</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={handleConfirmDate}
              onCancel={hideDatePicker}
            />

            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              onConfirm={handleConfirmTime}
              onCancel={hideTimePicker}
            />
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
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