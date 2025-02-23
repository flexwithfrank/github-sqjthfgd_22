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
  Image,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

type Event = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  start_date: string;
  end_date: string;
  location: string;
  location_url: string;
  highlights: Array<{
    icon: string;
    text: string;
  }>;
};

interface EditEventSheetProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function EditEventSheet({
  visible,
  onClose,
  event,
  onSuccess,
  onDelete,
}: EditEventSheetProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [form, setForm] = useState({
    title: event.title,
    description: event.description,
    location: event.location,
    location_url: event.location_url,
    start_date: new Date(event.start_date),
    end_date: new Date(event.end_date),
    highlights: event.highlights,
  });

  useEffect(() => {
    // Update form when event changes
    setForm({
      title: event.title,
      description: event.description,
      location: event.location,
      location_url: event.location_url,
      start_date: new Date(event.start_date),
      end_date: new Date(event.end_date),
      highlights: event.highlights,
    });
    setSelectedImage(null);
  }, [event]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to select image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      const fileExt = imageUri.split('.').pop();
      const fileName = `${event.id}_${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileData = new Uint8Array(
        atob(base64)
          .split('')
          .map((char) => char.charCodeAt(0))
      );

      const { data, error } = await supabase.storage
        .from('events')
        .upload(filePath, fileData, {
          contentType: `image/${fileExt}`,
        });

      if (error) throw error;

      return supabase.storage.from('events').getPublicUrl(filePath).data
        .publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!form.title.trim()) throw new Error('Title is required');
      if (!form.description.trim()) throw new Error('Description is required');
      if (!form.location.trim()) throw new Error('Location is required');
      if (form.end_date <= form.start_date)
        throw new Error('End time must be after start time');

      let imageUrl = event.image_url;

      // Upload new image if selected
      if (selectedImage) {
        const newImageUrl = await uploadImage(selectedImage);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      }

      // Update event
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          location_url: form.location_url.trim(),
          start_date: form.start_date.toISOString(),
          end_date: form.end_date.toISOString(),
          image_url: imageUrl,
          highlights: form.highlights,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating event:', error);
      setError(error.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);

              // Delete event from database
              const { error: deleteError } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

              if (deleteError) throw deleteError;

              // Delete event image from storage if it exists
              if (event.image_url) {
                const imagePath = event.image_url.split('/').pop();
                if (imagePath) {
                  await supabase.storage
                    .from('events')
                    .remove([`events/${imagePath}`]);
                }
              }

              onDelete?.();
              onClose();
            } catch (error: any) {
              console.error('Error deleting event:', error);
              setError(error.message || 'Failed to delete event');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
              <Text style={styles.title}>Edit Event</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={24}
                    color="#ff4444"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.content}>
              <TouchableOpacity
                style={[
                  styles.imageUpload,
                  selectedImage && styles.imagePreviewContainer,
                ]}
                onPress={pickImage}
              >
                {selectedImage || event.image_url ? (
                  <>
                    <Image
                      source={{ uri: selectedImage || event.image_url }}
                      style={styles.imagePreview}
                    />
                    <View style={styles.imageOverlay}>
                      <MaterialCommunityIcons
                        name="camera"
                        size={24}
                        color="#ffffff"
                      />
                      <Text style={styles.imageOverlayText}>Change Image</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="image-plus"
                      size={32}
                      color="#666666"
                    />
                    <Text style={styles.imageUploadText}>Add Event Image</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Event Title</Text>
                  <TextInput
                    style={styles.input}
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    placeholder="Enter event title"
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
                    placeholder="Describe your event"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={form.location}
                    onChangeText={(text) =>
                      setForm({ ...form, location: text })
                    }
                    placeholder="Event location"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location URL (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.location_url}
                    onChangeText={(text) =>
                      setForm({ ...form, location_url: text })
                    }
                    placeholder="Google Maps URL"
                    placeholderTextColor="#666666"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Date & Time</Text>
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
                      Starts: {form.start_date.toLocaleString()}
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
                      Ends: {form.end_date.toLocaleString()}
                    </Text>
                  </TouchableOpacity>

                  <DateTimePickerModal
                    isVisible={showStartDatePicker}
                    mode="datetime"
                    onConfirm={(date) => {
                      setShowStartDatePicker(false);
                      setForm({
                        ...form,
                        start_date: date,
                        end_date: new Date(date.getTime() + 3600000),
                      });
                    }}
                    onCancel={() => setShowStartDatePicker(false)}
                    date={form.start_date}
                  />

                  <DateTimePickerModal
                    isVisible={showEndDatePicker}
                    mode="datetime"
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
                  <Text style={styles.label}>Highlights</Text>
                  {form.highlights.map((highlight, index) => (
                    <View key={index} style={styles.highlightInput}>
                      <MaterialCommunityIcons
                        name={highlight.icon as any}
                        size={24}
                        color="#b0fb50"
                      />
                      <TextInput
                        style={styles.highlightText}
                        value={highlight.text}
                        onChangeText={(text) => {
                          const newHighlights = [...form.highlights];
                          newHighlights[index].text = text;
                          setForm({ ...form, highlights: newHighlights });
                        }}
                        placeholder="Add highlight"
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
                    <Text style={styles.submitButtonText}>Save Changes</Text>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  imageUpload: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 8,
  },
  imageUploadText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 8,
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
  highlightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  highlightText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
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
