import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AddActivitySheet } from '../../components/ui/AddActivitySheet';

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  activity_date: string;
  start_time: string;
  duration_minutes: number;
  fitness_studio: string;
  trainer_id: string | null;
  trainer_name: string | null;
  notes: string;
  created_at: string;
};

export default function ClassHistory() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  const fetchActivities = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const handleDeleteActivity = async (activity: Activity) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This action cannot be undone.',
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
              const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', activity.id);

              if (error) throw error;

              // Remove activity from local state
              setActivities(activities.filter((a) => a.id !== activity.id));
              setShowMenu(false);
              setSelectedActivity(null);
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert('Error', 'Failed to delete activity');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Activity }) => {
    // Create date object and adjust for Pacific timezone
    const date = new Date(`${item.activity_date}T00:00:00-08:00`);

    return (
      <View style={styles.historyItem}>
        <Text style={styles.date}>
          {date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Los_Angeles'
          })}
        </Text>
        <View style={styles.classCard}>
          <View style={styles.classInfo}>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>
                {new Date(`${item.activity_date}T${item.start_time}-08:00`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                  timeZone: 'America/Los_Angeles'
                })}
              </Text>
              <Text style={styles.duration}>({item.duration_minutes}min)</Text>
            </View>
            <View style={styles.classDetails}>
              <Text style={styles.type}>{item.subtitle || 'ACTIVITY'}</Text>
              <Text style={styles.title}>{item.title}</Text>
              {item.fitness_studio && (
                <Text style={styles.location}>{item.fitness_studio}</Text>
              )}
              {item.trainer_name && (
                <View style={styles.trainerContainer}>
                  <MaterialCommunityIcons
                    name="account-check"
                    size={16}
                    color="#b0fb50"
                  />
                  <Text style={styles.trainerName}>w/ {item.trainer_name}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                setSelectedActivity(item);
                setShowMenu(true);
              }}
            >
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={24}
                color="#666666"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookAgainButton}>
              <Text style={styles.bookAgainText}>Book Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#b0fb50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activities yet</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddSheet(true)}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#000000" />
        <Text style={styles.addButtonText}>Add Activity</Text>
      </TouchableOpacity>

      <AddActivitySheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSuccess={() => {
          setShowAddSheet(false);
          fetchActivities();
        }}
      />

      {/* Activity Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (selectedActivity) {
                  handleDeleteActivity(selectedActivity);
                }
              }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color="#ff4444"
              />
              <Text style={[styles.menuText, styles.menuTextDestructive]}>
                Delete Activity
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  listContent: {
    padding: 20,
  },
  historyItem: {
    marginBottom: 24,
  },
  date: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  classCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  classInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeContainer: {
    marginRight: 16,
  },
  time: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  classDetails: {
    flex: 1,
  },
  type: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  trainerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trainerName: {
    fontSize: 14,
    color: '#b0fb50',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 16,
  },
  moreButton: {
    padding: 4,
  },
  bookAgainButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#b0fb50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  bookAgainText: {
    color: '#b0fb50',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b0fb50',
    margin: 16,
    padding: 16,
    borderRadius: 50,
    gap: 8,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  menuText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  menuTextDestructive: {
    color: '#ff4444',
  },
});
