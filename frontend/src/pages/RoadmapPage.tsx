import { useState, useEffect } from 'react';
import { useRoadmapStore, Roadmap } from '../stores/roadmapStore';
import { roadmapAPI } from '../services/api';
import styles from './RoadmapPage.module.css';

export default function RoadmapPage() {
  const store = useRoadmapStore();
  const [loading, setLoading] = useState(true);
  const [roadmapType, setRoadmapType] = useState('new_grad');

  const mapBackendRoadmap = (item: any): Roadmap => {
    const weeks = (item?.roadmapContent || []).map((week: any) => ({
      week: week.week,
      title: week.focus,
      topics: week.topics || [],
      tasks: (week.tasks || []).map((task: any) => ({
        id: task.id,
        description: task.description,
        completed: task.completed,
        hoursRequired: Math.ceil((week.estimatedHours || 8) / Math.max((week.tasks || []).length, 1)),
      })),
      resources: [],
      status: week.tasks?.every((task: any) => task.completed)
        ? 'completed'
        : week.tasks?.some((task: any) => task.completed)
        ? 'in_progress'
        : 'not_started',
      progress: Math.round(
        ((week.tasks || []).filter((task: any) => task.completed).length /
          Math.max((week.tasks || []).length, 1)) *
          100
      ),
    }));

    return {
      id: item.id,
      userId: item.userId,
      type:
        item.estimatedDaysToComplete > 60
          ? ('new_grad' as const)
          : ('experienced' as const),
      duration: Math.ceil((item.estimatedDaysToComplete || 56) / 7),
      targetCompanies: [String(item.companyId)],
      weeks,
      createdAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + (item.estimatedDaysToComplete || 56) * 86400000).toISOString(),
    };
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        const response = await roadmapAPI.getRoadmap();
        const payload = response.data?.data ?? response.data ?? [];
        const firstRoadmap = Array.isArray(payload) ? payload[0] : payload;
        if (firstRoadmap) {
          store.setRoadmap(mapBackendRoadmap(firstRoadmap));
        }
      } catch (error) {
        console.error('Error fetching roadmap:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, []);

  const generateNewRoadmap = async (type: string) => {
    try {
      setLoading(true);
      const response = await roadmapAPI.generate({
        companyId: 1,
        targetRole: 'Software Engineer',
        experienceLevel: type as 'new_grad' | 'experienced',
        difficulty: 'medium',
      });
      const payload = response.data?.data ?? response.data;
      store.setRoadmap(mapBackendRoadmap(payload));
    } catch (error) {
      console.error('Error generating roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Generating your personalized roadmap...</div>
      </div>
    );
  }

  if (!store.roadmap) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Preparation Roadmap</h1>
          <p>Create your personalized interview preparation plan</p>
        </div>

        <div className={styles.generateCard}>
          <h2>Choose Your Path</h2>
          <div className={styles.options}>
            <button
              className={`${styles.optionBtn} ${roadmapType === 'new_grad' ? styles.active : ''}`}
              onClick={() => setRoadmapType('new_grad')}
            >
              <span className={styles.title}>New Graduate</span>
              <span className={styles.duration}>12 weeks</span>
              <span className={styles.desc}>Comprehensive preparation from scratch</span>
            </button>
            <button
              className={`${styles.optionBtn} ${roadmapType === 'experienced' ? styles.active : ''}`}
              onClick={() => setRoadmapType('experienced')}
            >
              <span className={styles.title}>Experienced</span>
              <span className={styles.duration}>8 weeks</span>
              <span className={styles.desc}>Accelerated track for experienced engineers</span>
            </button>
          </div>

          <button
            className={styles.generateBtn}
            onClick={() => generateNewRoadmap(roadmapType)}
          >
            Generate Roadmap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Your Preparation Roadmap</h1>
        <div className={styles.roadmapInfo}>
          <span>{store.roadmap.duration} weeks</span>
          <span>{store.roadmap.type === 'new_grad' ? 'New Graduate' : 'Experienced'}</span>
          <span>Progress: {Math.round(store.roadmap.weeks.reduce((acc, week) => acc + week.progress, 0) / Math.max(store.roadmap.weeks.length, 1))}%</span>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progress}
          style={{
            width: `${Math.round(
              store.roadmap.weeks.reduce((acc, week) => acc + week.progress, 0) /
                Math.max(store.roadmap.weeks.length, 1)
            )}%`,
          }}
        ></div>
      </div>

      <div className={styles.timeline}>
        {store.roadmap.weeks.map((week) => (
          <div key={week.week} className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <h3>Week {week.week}</h3>
              <span className={`${styles.status} ${styles[week.status]}`}>
                {week.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <h4>{week.title}</h4>

            <div className={styles.topics}>
              {week.topics.map((topic, idx) => (
                <span key={idx} className={styles.topic}>
                  {topic}
                </span>
              ))}
            </div>

            <div className={styles.tasks}>
              <h5>Tasks ({week.tasks.filter((t) => t.completed).length}/{week.tasks.length})</h5>
              {week.tasks.slice(0, 3).map((task) => (
                <div key={task.id} className={styles.task}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {
                      // Toggle completion
                    }}
                  />
                  <span className={task.completed ? styles.completed : ''}>
                    {task.description}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.weekProgress}>
              <div className={styles.progressSmall} style={{ width: `${week.progress}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
