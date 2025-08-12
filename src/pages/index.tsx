import { useEffect, useState, useReducer } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { IS_CHINESE } from '@/utils/const';
import {
  Activity,
  IViewState,
  filterAndSortRuns,
  filterCityRuns,
  filterTitleRuns,
  filterTypeRuns,
  filterYearRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  scrollToMap,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';

const SHOW_LOCATION_STAT = 'SHOW_LOCATION_STAT';
const SHOW_YEARS_STAT = 'SHOW_YEARS_STAT';

// 替换原来的 reducer 函数
const reducer = (state: any, action: { type: any }) => {
  switch (action.type) {
    case SHOW_LOCATION_STAT:
      return { ...state, showLocationStat: true };
    case SHOW_YEARS_STAT:
      return { ...state, showLocationStat: false };
    default:
      return state;
  }
};

const Index = () => {
  const { siteTitle, navLinks } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [runs, setActivity] = useState(
    filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc)
  );
  const [title, setTitle] = useState('');
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  // for auto zoom
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState<number>();

  const [viewState, setViewState] = useState<IViewState>({
    ...bounds,
  });

  // 初始化 state 和 dispatch 函数
const [state, dispatch] = useReducer(reducer, {
  showLocationStat: false,  // 只保留这一个属性
});

  const changeByItem = (
    item: string,
    name: string,
    func: (_run: Activity, _value: string) => boolean
  ) => {
    scrollToMap();
    if (name != 'Year') {
      setYear(thisYear);
    }
    setActivity(filterAndSortRuns(activities, item, func, sortDateFunc));
    setRunIndex(-1);
    setTitle(`${item} ${name} Heatmap`);
  };

  const changeYear = (y: string) => {
    // default year
    setYear(y);

    if ((viewState.zoom ?? 0) > 3 && bounds) {
      setViewState({
        ...bounds,
      });
    }

    changeByItem(y, 'Year', filterYearRuns);
    clearInterval(intervalId);
  };

  const changeCity = (city: string) => {
    changeByItem(city, 'City', filterCityRuns);
  };

  // eslint-disable-next-line no-unused-vars
  const changeTitle = (title: string) => {
    changeByItem(title, 'Title', filterTitleRuns);
  };

  const changeType = (type: string) => {
    changeByItem(type, 'Type', filterTypeRuns);
  };

  const changeTypeInYear = (year: string, type: string) => {
    scrollToMap();
    // type in year, filter year first, then type
    if (year != 'Total') {
      setYear(year);
      setActivity(
        filterAndSortRuns(
          activities,
          year,
          filterYearRuns,
          sortDateFunc,
          type,
          filterTypeRuns
        )
      );
    } else {
      setYear(thisYear);
      setActivity(
        filterAndSortRuns(activities, type, filterTypeRuns, sortDateFunc)
      );
    }
    setRunIndex(-1);
    setTitle(`${year} ${type} Type Heatmap`);
  };

  const locateActivity = (runIds: RunIds) => {
    const ids = new Set(runIds);

    const selectedRuns = !runIds.length
      ? runs
      : runs.filter((r: any) => ids.has(r.run_id));

    if (!selectedRuns.length) {
      return;
    }

    const lastRun = selectedRuns.sort(sortDateFunc)[0];

    if (!lastRun) {
      return;
    }
    setGeoData(geoJsonForRuns(selectedRuns));
    setTitle(titleForShow(lastRun));
    clearInterval(intervalId);
    scrollToMap();
  };

  useEffect(() => {
    setViewState({
      ...bounds,
    });
  }, [geoData]);

  useEffect(() => {
    const runsNum = runs.length;
    // maybe change 20 ?
    const sliceNum = runsNum >= 10 ? runsNum / 10 : 1;
    let i = sliceNum;
    const id = setInterval(() => {
      if (i >= runsNum) {
        clearInterval(id);
      }

      const tempRuns = runs.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNum;
    }, 10);
    setIntervalId(id);
  }, [runs]);

  useEffect(() => {
    if (year !== 'Total') {
      return;
    }

    let svgStat = document.getElementById('svgStat');
    if (!svgStat) {
      return;
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        // Use querySelector to get the <desc> element and the <title> element.
        const descEl = target.querySelector('desc');
        if (descEl) {
          // If the runId exists in the <desc> element, it means that a running route has been clicked.
          const runId = Number(descEl.innerHTML);
          if (!runId) {
            return;
          }
          locateActivity([runId]);
          return;
        }

        const titleEl = target.querySelector('title');
        if (titleEl) {
          // If the runDate exists in the <title> element, it means that a date square has been clicked.
          const [runDate] = titleEl.innerHTML.match(
            /\d{4}-\d{1,2}-\d{1,2}/
          ) || [`${+thisYear + 1}`];
          const runIDsOnDate = runs
            .filter((r) => r.start_date_local.slice(0, 10) === runDate)
            .map((r) => r.run_id);
          if (!runIDsOnDate.length) {
            return;
          }
          locateActivity(runIDsOnDate);
        }
      }
    };
    svgStat.addEventListener('click', handleClick);
    return () => {
      svgStat && svgStat.removeEventListener('click', handleClick);
    };
  }, [year]);

  // 切换显示组件的函数
const handleToggle = () => {
  if (state.showLocationStat) {
    // 如果当前显示地点统计，切换到年份统计
    dispatch({ type: SHOW_YEARS_STAT });
    // 调整zoom
     setViewState({
      ...bounds,  // 使用初始bounds
    });
  } else {
    // 如果当前显示年份统计，切换到地点统计
    dispatch({ type: SHOW_LOCATION_STAT });
    // 调整zoom
    setViewState((prevState) => ({
      ...prevState,
      zoom: 3,
    }));
  }
};

  // 监听zoom变化，仅在自动模式下切换显示状态
useEffect(() => {
  if (IS_CHINESE) {
    if ((viewState.zoom ?? 0) <= 3) {
      dispatch({ type: SHOW_LOCATION_STAT });
    } else {
      dispatch({ type: SHOW_YEARS_STAT });
    }
  }
}, [viewState.zoom]);



  const buttonBaseStyle = {
    backgroundColor: '#003300', // 与页面背景相同的暗色
    color: 'rgb(0,237,94)', // 亮绿色，与页面其他绿色文字一致
    border: '1px solid #00aa00', // 绿色边框
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center' as const,
    minWidth: '130px', // 最小宽度
    height: '40px', // 固定高度
    lineHeight: '20px', // 垂直居中
    boxSizing: 'border-box' as const, // 包含边框和内边距
    boxShadow: '0 0 8px rgba(0, 255, 0, 0.3)',
  };

  const buttonHoverStyle = {
    backgroundColor: 'rgba(0, 60, 0, 0.9)', // 更亮的绿色背景
    color: '#ffffff', // 白色文字
    borderColor: 'rgb(0, 255, 100)', // 亮绿色边框
    // 强烈的外发光和轻微的上移效果
    boxShadow:
      'inset 0 0 15px rgba(0, 255, 100, 0.3), 0 0 20px rgba(0, 255, 100, 0.6)',
    transform: 'translateY(-3px) scale(1.03)', // 上移并轻微放大
    // 添加文字发光效果
    textShadow: '0 0 8px rgba(255, 255, 255, 0.7)',
  };

  // 在组件中使用
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isSummaryHovered, setIsSummaryHovered] = useState(false);

  // 确定当前应该显示哪个组件
const shouldShowLocationStat = state.showLocationStat && IS_CHINESE

  // 找到 Summary 链接
  const summaryLink = navLinks.find((link) => link.name === 'Summary');

  return (
    <Layout>
      <div className="w-full lg:w-1/4">
        <h1
          className="mb-5 mt-0 text-4xl font-extrabold italic"
          style={{ fontSize: '2.8rem' }}
        >
          <a href="/">{siteTitle}</a>
        </h1>
        <div className="mb-4 flex flex-wrap gap-2">
          {/* 使用 flex 布局放置按钮 */}
          {summaryLink && (
            <a
              href={summaryLink.url}
              style={
                isSummaryHovered
                  ? { ...buttonBaseStyle, ...buttonHoverStyle }
                  : buttonBaseStyle
              }
              onMouseEnter={() => setIsSummaryHovered(true)}
              onMouseLeave={() => setIsSummaryHovered(false)}
            >
              查看汇总统计
            </a>
          )}
          <button
            onClick={handleToggle}
            style={
              isToggleHovered
                ? { ...buttonBaseStyle, ...buttonHoverStyle }
                : buttonBaseStyle
            }
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
          >
            {state.showLocationStat ? '切换年份统计' : '切换地点统计'}
          </button>
        </div>

        {shouldShowLocationStat ? (
          <LocationStat
            changeYear={changeYear}
            changeCity={changeCity}
            changeType={changeType}
            onClickTypeInYear={changeTypeInYear}
          />
        ) : (
          <YearsStat
            year={year}
            onClick={changeYear}
            onClickTypeInYear={changeTypeInYear}
          />
        )}
      </div>
      <div className="w-full lg:w-4/5">
        <RunMap
          title={title}
          viewState={viewState}
          geoData={geoData}
          setViewState={setViewState}
          changeYear={changeYear}
          thisYear={year}
        />
        {year === 'Total' ? (
          <SVGStat />
        ) : (
          <RunTable
            runs={runs}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
            year={year}
          />
        )}
      </div>
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
