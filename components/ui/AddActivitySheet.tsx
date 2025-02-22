import { useState, useEffect } from 'react';
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
  Image,  // Add this import
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

type WorkoutOption = {
  id: string;
  name: string;
  category: string;
  icon: string;
};

type Trainer = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  role_verified: boolean;
};

export function AddActivitySheet({ visible, onClose, onSuccess }: AddActivitySheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [showTrainerPicker, setShowTrainerPicker] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutOption | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

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

  useEffect(() => {
    fetchWorkoutOptions();
    fetchTrainers();
  }, []);

  const fetchWorkoutOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_options')
        .select('*')
        .order('name');

      if (error) throw error;
      setWorkoutOptions(data || []);
    } catch (error) {
      console.error('Error fetching workout options:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, role_verified')
        .eq('role', 'trainer')
        .eq('role_verified', true)
        .order('display_name');

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate inputs
      if (!selectedWorkout) {
        setError('Please select a workout type');
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

      // Create activity
      const { error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          title: selectedWorkout.name,
          subtitle: selectedWorkout.category,
          activity_date: formattedDate,
          start_time: formattedTime,
          duration_minutes: parseInt(form.duration_minutes),
          fitness_studio: form.fitness_studio.trim(),
          trainer_id: selectedTrainer?.id || null,
          trainer_name: selectedTrainer?.display_name || null,
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
      setSelectedWorkout(null);
      setSelectedTrainer(null);

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

  const WorkoutPicker = () => (
    <Modal
      visible={showWorkoutPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowWorkoutPicker(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowWorkoutPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Workout</Text>
            <ScrollView style={styles.workoutList}>
              {workoutOptions.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutOption}
                  onPress={() => {
                    setSelectedWorkout(workout);
                    setShowWorkoutPicker(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name={workout.icon as any}
                    size={24}
                    color="#b0fb50"
                  />
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <Text style={styles.workoutCategory}>{workout.category}</Text>
                  </View>
                  {selectedWorkout?.id === workout.id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color="#b0fb50"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const TrainerPicker = () => (
    <Modal
      visible={showTrainerPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTrainerPicker(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowTrainerPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Trainer</Text>
            <ScrollView style={styles.workoutList}>
              {trainers.map((trainer) => (
                <TouchableOpacity
                  key={trainer.id}
                  style={styles.workoutOption}
                  onPress={() => {
                    setSelectedTrainer(trainer);
                    setShowTrainerPicker(false);
                  }}
                >
                  <View style={styles.trainerAvatar}>
                    {trainer.avatar_url ? (
                      <Image
                        source={{ uri: trainer.avatar_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="account"
                        size={24}
                        color="#666666"
                      />
                    )}
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{trainer.display_name}</Text>
                    <View style={styles.verifiedBadge}>
                      <MaterialCommunityIcons
                        name="check-decagram"
                        size={16}
                        color="#b0fb50"
                      />
                      <Text style={styles.verifiedText}>Verified Trainer</Text>
                    </View>
                  </View>
                  {selectedTrainer?.id === trainer.id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color="#b0fb50"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

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
                  <Text style={styles.label}>Workout Type</Text>
                  <TouchableOpacity
                    style={styles.workoutSelector}
                    onPress={() => setShowWorkoutPicker(true)}
                  >
                    {selectedWorkout ? (
                      <View style={styles.selectedWorkout}>
                        <MaterialCommunityIcons
                          name={selectedWorkout.icon as any}
                          size={24}
                          color="#b0fb50"
                        />
                        <Text style={styles.selectedWorkoutText}>
                          {selectedWorkout.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.workoutPlaceholder}>
                        Select workout type
                      </Text>
                    )}
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={24}
                      color="#666666"
                    />
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    style={styles.workoutSelector}
                    onPress={() => setShowTrainerPicker(true)}
                  >
                    {selectedTrainer ? (
                      <View style={styles.selectedWorkout}>
                        <View style={styles.trainerAvatar}>
                          {selectedTrainer.avatar_url ? (
                            <Image
                              source={{ uri: selectedTrainer.avatar_url }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="account"
                              size={24}
                              color="#666666"
                            />
                          )}
                        </View>
                        <Text style={styles.selectedWorkoutText}>
                          {selectedTrainer.display_name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.workoutPlaceholder}>
                        Select trainer (optional)
                      </Text>
                    )}
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={24}
                      color="#666666"
                    />
                  </TouchableOpacity>
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

            <WorkoutPicker />
            <TrainerPicker />
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
  workoutSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  selectedWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedWorkoutText: {
    color: '#ffffff',
    fontSize: 16,
  },
  workoutPlaceholder: {
    color: '#666666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  workoutList: {
    padding: 20,
  },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workoutName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  workoutCategory: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  trainerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedText: {
    color: '#b0fb50',
    fontSize: 12,
    marginLeft: 4,
  },
});