import {
  formatPace,
  colorFromType,
  titleForRun,
  formatRunTime,
  Activity,
  RunIds,
} from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';
import styles from './style.module.css';

interface IRunRowProperties {
  elementIndex: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
  maxRunRecord: boolean;
  maxTrailRecord: boolean;
  maxTrackRecord: boolean;
}

// 在 import 语句下方添加
const typeMapping: { [key: string]: string } = {
  Hike: '徒步',
  Ride: '骑行',
  VirtualRide: '虚拟骑行',
  Rowing: '划船',
  Run: '路跑',
  'Trail Run': '越野跑',
  Swim: '游泳',
  RoadTrip: '公路旅行',
  Kayaking: '皮划艇',
  Snowboard: '滑雪',
  Ski: '滑板',
  'Track Run': '操场跑',
};

const RunRow = ({
  elementIndex,
  locateActivity,
  run,
  runIndex,
  setRunIndex,
  maxRunRecord,
  maxTrailRecord,
  maxTrackRecord,
}: IRunRowProperties) => {
  const distance = (run.distance / 1000.0).toFixed(2) + 'km';
  const elevation_gain = run.elevation_gain?.toFixed(0) + 'm';
  const paceParts = run.average_speed
    ? formatPace(run.average_speed) + '/km'
    : null;
  const heartRate = run.average_heartrate;
  const type = typeMapping[run.type] || run.type;
  const runTime = formatRunTime(run.moving_time);
  const handleClick = () => {
    if (runIndex === elementIndex) {
      setRunIndex(-1);
      locateActivity([]);
      return;
    }
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
  };

  return (
    <tr
      className={`${styles.runRow} ${runIndex === elementIndex ? styles.selected : ''} ${maxRunRecord ? styles.maxRunRecord : ''} ${maxTrailRecord ? styles.maxTrailRecord : ''} ${maxTrackRecord ? styles.maxTrackRecord : ''}`}
      key={run.start_date_local}
      onClick={handleClick}
      style={{ color: colorFromType(type) }}
    >
      <td>{titleForRun(run)}</td>
      <td>{type}</td>
      <td>{distance}</td>
      {SHOW_ELEVATION_GAIN && <td>{elevation_gain ?? 0.0}</td>}
      <td>{paceParts}</td>
      <td>{heartRate && heartRate.toFixed(0) + 'bpm'}</td>
      <td>{runTime}</td>
      {/*如果说是想保持日期列和运动颜色统一，就删除掉className={styles.runDate}就行了，想之前的展示td里边加上去就行了*/}
      <td>{run.start_date_local}</td>
    </tr>
  );
};

export default RunRow;
