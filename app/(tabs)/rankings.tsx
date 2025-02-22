import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Progress = {
  current_value: number;
  user_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type Challenge = {
  id: string;
  unit: string;
  target_value: number;
};

export default function RankingsScreen() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch active challenge
      const { data: challenges, error: challengeError } = await supabase
        .from('challenges')
        .select('id, unit, target_value')
        .eq('status', 'active');

      if (challengeError) throw challengeError;

      if (!challenges || challenges.length === 0) {
        setError('No active challenge found');
        return;
      }

      setChallenge(challenges[0]);

      // Fetch challenge progress
      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select(
          `
          current_value,
          user_id,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq('challenge_id', challenges[0].id)
        .order('current_value', { ascending: false });

      if (progressError) throw progressError;
      setProgress(progressData || []);

      // Find current user's rank
      if (user) {
        const userRank = progressData?.findIndex((p) => p.user_id === user.id);
        setCurrentUserRank(userRank !== -1 ? userRank + 1 : null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load rankings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleProfilePress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  if (error || !challenge) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const top3 = progress.slice(0, 3);
  const remainingRanks = progress.slice(3);

  const TopThree = () => (
    <View style={styles.top3Container}>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(176,251,80,0.1)']}
        style={styles.top3Background}
      />

      <View style={styles.podium}>
        {/* Second Place */}
        {top3[1] && (
          <View style={[styles.podiumItem, styles.secondPlace]}>
            <TouchableOpacity
              onPress={() => handleProfilePress(top3[1].user_id)}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>2</Text>
              </View>
              <Image
                source={{
                  uri:
                    top3[1].profiles.avatar_url ||
                    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
                }}
                style={styles.podiumAvatar}
              />
              <Text style={styles.podiumName} numberOfLines={1}>
                {top3[1].profiles.display_name}
              </Text>
              <Text style={styles.podiumScore}>
                {top3[1].current_value} {challenge.unit}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* First Place */}
        {top3[0] && (
          <View style={[styles.podiumItem, styles.firstPlace]}>
            <TouchableOpacity
              onPress={() => handleProfilePress(top3[0].user_id)}
            >
              <View style={[styles.firstPlaceBadge]}>
                <MaterialCommunityIcons
                  name="crown"
                  size={20}
                  color="#b0fb50"
                />
              </View>
              <Image
                source={{
                  uri:
                    top3[0].profiles.avatar_url ||
                    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
                }}
                style={[styles.podiumAvatar, styles.firstPlaceAvatar]}
              />
              <Text
                style={[styles.podiumName, styles.firstPlaceName]}
                numberOfLines={1}
              >
                {top3[0].profiles.display_name}
              </Text>
              <Text style={[styles.podiumScore, styles.firstPlaceScore]}>
                {top3[0].current_value} {challenge.unit}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Third Place */}
        {top3[2] && (
          <View style={[styles.podiumItem, styles.thirdPlace]}>
            <TouchableOpacity
              onPress={() => handleProfilePress(top3[2].user_id)}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>3</Text>
              </View>
              <Image
                source={{
                  uri:
                    top3[2].profiles.avatar_url ||
                    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
                }}
                style={styles.podiumAvatar}
              />
              <Text style={styles.podiumName} numberOfLines={1}>
                {top3[2].profiles.display_name}
              </Text>
              <Text style={styles.podiumScore}>
                {top3[2].current_value} {challenge.unit}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const CurrentRankBanner = () =>
    currentUserRank ? (
      <LinearGradient
        colors={['#b0fb50', '#86c23d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.currentRankBanner}
      >
        <Text style={styles.currentRankText}>You Currently Rank</Text>
        <View style={styles.currentRankNumber}>
          <Text style={styles.currentRankValue}>{currentUserRank}</Text>
          <MaterialCommunityIcons name="chevron-up" size={20} color="#000000" />
        </View>
      </LinearGradient>
    ) : null;

  const renderRankItem = ({
    item,
    index,
  }: {
    item: Progress;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.rankItem}
      onPress={() => handleProfilePress(item.user_id)}
    >
      <Text style={styles.rank}>{index + 4}</Text>
      <Image
        source={{
          uri:
            item.profiles.avatar_url ||
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.profiles.display_name}</Text>
        <Text style={styles.username}>@{item.profiles.username}</Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{item.current_value}</Text>
        <Text style={styles.unit}>{challenge.unit}</Text>
        {/* <MaterialCommunityIcons 
          name="chevron-up" 
          size={16} 
          color="#b0fb50" 
        /> */}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={remainingRanks}
        renderItem={renderRankItem}
        keyExtractor={(item) => item.user_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#b0fb50"
          />
        }
        ListHeaderComponent={
          <>
            <TopThree />
            <CurrentRankBanner />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No participants yet</Text>
          </View>
        }
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#b0fb50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  top3Container: {
    paddingVertical: 40,
    width: '100%',
  },
  top3Background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Ensure even spacing
    alignItems: 'flex-end', // Align items to the bottom
    paddingHorizontal: 20,
  },
  podiumItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  firstPlace: {
    marginTop: -20,
  },
  secondPlace: {
    marginTop: 0,
  },
  thirdPlace: {
    marginTop: 0,
  },
  rankBadge: {
    position: 'absolute',
    top: -10,
    right: -10, // Ensure the same position for all rank badges
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  firstPlaceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    top: -10,
    right: -10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rankNumber: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  podiumAvatar: {
    width: 80, // Smaller size for 2nd and 3rd place
    height: 80, // Smaller size for 2nd and 3rd place
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  firstPlaceAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: '#b0fb50',
    borderWidth: 4,
  },
  podiumName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    maxWidth: 100,
    textAlign: 'center',
  },
  firstPlaceName: {
    fontSize: 16,
    color: '#b0fb50',
  },
  podiumScore: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
  firstPlaceScore: {
    color: '#b0fb50',
    fontSize: 14,
  },
  currentRankBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  currentRankText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  currentRankNumber: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentRankValue: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rank: {
    width: 40,
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#666666',
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    color: '#b0fb50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unit: {
    color: '#666666',
    fontSize: 12,
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
});
