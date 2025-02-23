import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateChallengeSheet } from '../../components/ui/CreateChallengeSheet';

type Challenge = {
  id: string;
  title: string;
  subtitle: string;
  status: 'active' | 'completed' | 'upcoming';
  start_date: string;
  end_date: string;
  participant_count: number;
};

export default function AdminChallengesScreen() {
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchChallenges();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/sign-in');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('admin, role_verified')
        .eq('id', user.id)
        .single();

      if (!profile?.admin || !profile?.role_verified) {
        router.replace('/(tabs)');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.replace('/(tabs)');
    }
  };

  const fetchChallenges = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (challengeId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ status: newStatus })
        .eq('id', challengeId);

      if (updateError) throw updateError;
      fetchChallenges();
    } catch (error) {
      console.error('Error updating challenge status:', error);
      Alert.alert('Error', 'Failed to update challenge status');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    Alert.alert(
      'Delete Challenge',
      'Are you sure you want to delete this challenge? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('challenges')
                .delete()
                .eq('id', challengeId);

              if (error) throw error;
              fetchChallenges();
            } catch (error) {
              console.error('Error deleting challenge:', error);
              Alert.alert('Error', 'Failed to delete challenge');
            }
          },
        },
      ]
    );
  };

  const ChallengeSection = ({ title, status }: { title: string; status: string }) => {
    const filteredChallenges = challenges.filter(c => c.status === status);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {filteredChallenges.length === 0 ? (
          <Text style={styles.emptyText}>No {status} challenges</Text>
        ) : (
          filteredChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeSubtitle}>{challenge.subtitle}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteChallenge(challenge.id)}
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons name="delete" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.challengeInfo}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#666666" />
                  <Text style={styles.infoText}>
                    {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#666666" />
                  <Text style={styles.infoText}>
                    {challenge.participant_count} participants
                  </Text>
                </View>
              </View>

              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    challenge.status === 'upcoming' && styles.activeStatus
                  ]}
                  onPress={() => handleStatusChange(challenge.id, 'upcoming')}
                >
                  <Text style={[
                    styles.statusButtonText,
                    challenge.status === 'upcoming' && styles.activeStatusText
                  ]}>Upcoming</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    challenge.status === 'active' && styles.activeStatus
                  ]}
                  onPress={() => handleStatusChange(challenge.id, 'active')}
                >
                  <Text style={[
                    styles.statusButtonText,
                    challenge.status === 'active' && styles.activeStatusText
                  ]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    challenge.status === 'completed' && styles.activeStatus
                  ]}
                  onPress={() => handleStatusChange(challenge.id, 'completed')}
                >
                  <Text style={[
                    styles.statusButtonText,
                    challenge.status === 'completed' && styles.activeStatusText
                  ]}>Completed</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Challenges</Text>
      </View>

      <ScrollView style={styles.content}>
        <ChallengeSection title="Active Challenges" status="active" />
        <ChallengeSection title="Upcoming Challenges" status="upcoming" />
        <ChallengeSection title="Completed Challenges" status="completed" />
      </ScrollView>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateSheet(true)}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#000000" />
        <Text style={styles.createButtonText}>Create Challenge</Text>
      </TouchableOpacity>

      <CreateChallengeSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSuccess={() => {
          setShowCreateSheet(false);
          fetchChallenges();
        }}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  challengeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  challengeSubtitle: {
    fontSize: 14,
    color: '#b0fb50',
  },
  deleteButton: {
    padding: 4,
  },
  challengeInfo: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    marginLeft: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  activeStatus: {
    backgroundColor: '#b0fb50',
    borderColor: '#b0fb50',
  },
  activeStatusText: {
    color: '#000000',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b0fb50',
    margin: 16,
    padding: 16,
    borderRadius: 50,
    gap: 8,
  },
  createButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});