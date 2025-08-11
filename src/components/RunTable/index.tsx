import React, { useState } from 'react';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
  formatPace,
} from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';

import RunRow from './RunRow';
import styles from './style.module.css';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  // 跑步
  let run_speed = 0;
  let max_run = null;
  // 越野跑
  let trail_speed = 0;
  let max_trail = null;
  // 找到最大速度
  runs.forEach((item) => {
    if (item.type == 'Run' || item.type == 'Track Run') {
      if (item.average_speed > run_speed) {
        run_speed = item.average_speed;
        max_run = item;
      }
    }
    if (item.type == 'Trail Run') {
      if (item.average_speed > trail_speed) {
        trail_speed = item.average_speed;
        max_trail = item;
      }
    }
  });

  // 安全访问属性
  const pbrundistance = max_run ? (max_run.distance / 1000.0).toFixed(2) : '0';
  const pbrunpaceParts = max_run?.average_speed
    ? formatPace(max_run.average_speed)
    : null;

  const pbtraildistance = max_trail
    ? (max_trail.distance / 1000.0).toFixed(2)
    : '0';
  const pbtrailpaceParts = max_trail?.average_speed
    ? formatPace(max_trail.average_speed)
    : null;

  const [sortFuncInfo, setSortFuncInfo] = useState('');
  // TODO refactor?
  const sortTypeFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Type'
      ? a.type > b.type
        ? 1
        : -1
      : b.type < a.type
        ? -1
        : 1;
  const sortKMFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'KM' ? a.distance - b.distance : b.distance - a.distance;
  const sortElevationGainFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Elevation Gain'
      ? (a.elevation_gain ?? 0) - (b.elevation_gain ?? 0)
      : (b.elevation_gain ?? 0) - (a.elevation_gain ?? 0);
  const sortPaceFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Pace'
      ? a.average_speed - b.average_speed
      : b.average_speed - a.average_speed;
  const sortBPMFunc: SortFunc = (a, b) => {
    return sortFuncInfo === 'BPM'
      ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
      : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
  };
  const sortRunTimeFunc: SortFunc = (a, b) => {
    const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
    const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
    return sortFuncInfo === 'Time'
      ? aTotalSeconds - bTotalSeconds
      : bTotalSeconds - aTotalSeconds;
  };
  const sortDateFuncClick =
    sortFuncInfo === 'Date' ? sortDateFunc : sortDateFuncReverse;
  // const sortFuncMap = new Map([
  //   ['Workout Type', sortTypeFunc],
  //   ['KM', sortKMFunc],
  //   ['Elevation Gain', sortElevationGainFunc],
  //   ['Pace', sortPaceFunc],
  //   ['BPM', sortBPMFunc],
  //   ['Time', sortRunTimeFunc],
  //   ['Date', sortDateFuncClick],
  // ]);
  const sortFuncMap = new Map([
    ['运动类型', sortTypeFunc],
    ['公里数', sortKMFunc],
    ['累计爬升', sortElevationGainFunc],
    ['平均配速', sortPaceFunc],
    ['平均心率', sortBPMFunc],
    ['运动时长', sortRunTimeFunc],
    ['运动日期', sortDateFuncClick],
  ]);
  // if (!SHOW_ELEVATION_GAIN) {
  //   sortFuncMap.delete('Elevation Gain');
  // }
  if (!SHOW_ELEVATION_GAIN) {
    sortFuncMap.delete('累计爬升');
  }

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    const funcName = (e.target as HTMLElement).innerHTML;
    const f = sortFuncMap.get(funcName);

    setRunIndex(-1);
    setSortFuncInfo(sortFuncInfo === funcName ? '' : funcName);
    setActivity(runs.sort(f));
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.runDate}>本年度最佳记录：</div>
      {max_run ? (
        <div className={styles.runDate}>
          跑步：(时间：{max_run.start_date_local.split(' ')[0]}，配速：
          {pbrunpaceParts}/km，距离：{pbrundistance}km)
        </div>
      ) : null}
      {max_trail ? (
        <div className={styles.runDate}>
          跑山：(时间：{max_trail.start_date_local.split(' ')[0]}，配速：
          {pbtrailpaceParts}/km，距离：{pbtraildistance}km)
        </div>
      ) : null}
      <table className={styles.runTable} cellSpacing="0" cellPadding="0">
        <thead>
          <tr>
            <th />
            {Array.from(sortFuncMap.keys()).map((k) => (
              <th key={k} onClick={handleClick}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, elementIndex) => (
            <RunRow
              key={run.run_id}
              elementIndex={elementIndex}
              locateActivity={locateActivity}
              run={run}
              runIndex={runIndex}
              setRunIndex={setRunIndex}
              maxRunRecord={max_run?.run_id === run.run_id && max_run?.type === 'Run'}
              maxTrailRecord={max_trail?.run_id === run.run_id}
              maxTrackRecord={max_run?.run_id === run.run_id && max_run?.type === 'Track Run'}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunTable;
