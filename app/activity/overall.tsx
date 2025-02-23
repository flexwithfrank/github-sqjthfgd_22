import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type TimeRange = 'day' | 'week' | 'month';

type ActivityStats = {
  total_activities: number;
  total_duration: number;
};

export default function OverallActivity() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [stats, setStats] = useState<ActivityStats>({
    total_activities: 0,
    total_duration: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);  // New state for background updates

  useEffect(() => {
    fetchActivityStats();
  }, []);

  const handleTimeRangeChange = async (newRange: TimeRange) => {
    setTimeRange(newRange);
    setIsUpdating(true);
    await fetchActivityStats();
    setIsUpdating(false);
  };

  const fetchActivityStats = async () => {
    try {
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const now = new Date();
      let startDate = new Date();

      // Calculate date range based on selected timeRange
      switch (timeRange) {
        case 'day':
          // Set to start of current day
          startDate.setHours(0, 0, 0, 0);
          // Set end date to end of current day
          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          
          // Query specifically for today's activities using activity_date
          const { data: todayData, error: todayError } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', user.id)
            .eq('activity_date', startDate.toISOString().split('T')[0]);

          if (todayError) throw todayError;

          const totalDuration = todayData?.reduce((sum, activity) => {
            return sum + (activity.duration_minutes || 0);
          }, 0) || 0;

          setStats({
            total_activities: todayData?.length || 0,
            total_duration: totalDuration,
          });
          return;

        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(1);
          break;
      }

      // For week and month views, continue using created_at for historical data
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = now.toISOString();

      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', formattedStartDate)
        .lte('created_at', formattedEndDate)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const totalDuration = data?.reduce((sum, activity) => {
        return sum + (activity.duration_minutes || 0);
      }, 0) || 0;

      setStats({
        total_activities: data?.length || 0,
        total_duration: totalDuration,
      });

    } catch (error) {
      console.error('Error fetching activity stats:', error);
      setError('Failed to load activity statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivityStats();
  };

  const getDateRange = () => {
    const now = new Date();
    if (timeRange === 'day') {
      return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeRange === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return `${now.toLocaleDateString('en-US', { month: 'short' })} 1 - ${now.toLocaleDateString('en-US', { month: 'short' })} ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0fb50" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#b0fb50"
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.subtitle}>Your Activity Data</Text>

        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'day' && styles.activeTimeRange]}
            onPress={() => handleTimeRangeChange('day')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'day' && styles.activeTimeRangeText]}>
              TODAY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]}
            onPress={() => handleTimeRangeChange('week')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>
              WEEK
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]}
            onPress={() => handleTimeRangeChange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>
              MONTH
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dateRange}>{getDateRange()}</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchActivityStats}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.circleContainer}>
              <View style={styles.circle}>
                {isUpdating ? (
                  <ActivityIndicator color="#b0fb50" style={styles.inlineLoader} />
                ) : (
                  <>
                    <Text style={styles.circleNumber}>{stats.total_activities}</Text>
                    <Text style={styles.circleLabel}>Activities</Text>
                  </>
                )}
              </View>
            </View>

            <View style={[styles.additionalStats, isUpdating && styles.updating]}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#666666" />
                <Text style={styles.statLabel}>Total Time</Text>
                <Text style={styles.statValue}>{formatDuration(stats.total_duration)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#666666" />
                <Text style={styles.statLabel}>Avg. Duration</Text>
                <Text style={styles.statValue}>
                  {stats.total_activities > 0 
                    ? formatDuration(Math.round(stats.total_duration / stats.total_activities))
                    : '0m'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.connectButton}>
          <Text style={styles.connectButtonText}>Connect Fitness Tracker</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTimeRange: {
    backgroundColor: '#ffffff',
  },
  timeRangeText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTimeRangeText: {
    color: '#000000',
    fontWeight: '800',
  },
  dateRange: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    alignItems: 'center',
  },
  circleContainer: {
    marginBottom: 40,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#b0fb50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  circleLabel: {
    fontSize: 18,
    color: '#666666',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
  },
  statLabel: {
    color: '#666666',
    fontSize: 14,
    marginVertical: 8,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#b0fb50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 40,
  },
  connectButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
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
  inlineLoader: {
    padding: 20,
  },
  updating: {
    opacity: 0.5,
  },
});