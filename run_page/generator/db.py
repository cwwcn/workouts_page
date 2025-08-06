import datetime
import time
import requests

from config import TYPE_DICT
from sqlalchemy import (
  Column,
  Float,
  Integer,
  Interval,
  String,
  create_engine,
  inspect,
  text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

GAODE_API_KEY = "4ac61695c19fe2adcb317acecb8b41ed"
# 添加请求间隔控制（秒）
GAODE_API_DELAY = 0.8  # 每次请求间隔1秒
last_request_time = 0  # 记录上次请求时间


# 高德地图逆地理编码函数
def reverse_geocode_gaode(lat, lon):
  """
  使用高德地图API进行逆地理编码
  """
  global last_request_time

  # 控制请求频率，避免超过API限制
  current_time = time.time()
  time_since_last_request = current_time - last_request_time
  if time_since_last_request < GAODE_API_DELAY:
    time.sleep(GAODE_API_DELAY - time_since_last_request)

  url = "https://restapi.amap.com/v3/geocode/regeo"
  params = {
    'key': GAODE_API_KEY,
    'location': f'{lon},{lat}',  # 高德地图使用经度,纬度格式
    'extensions': 'base',
    'batch': 'false',
    'roadlevel': 0
  }

  try:
    last_request_time = time.time()  # 更新上次请求时间
    response = requests.get(url, params=params, timeout=5)
    result = response.json()
    if result.get('status') == '1':  # 请求成功
      # 解析地址组件
      address_component = result['regeocode']['addressComponent']

      # 按优先级获取地址信息
      components = []

      # 添加街道信息（如果存在）
      street_number = address_component.get('streetNumber', {})
      street = street_number.get('street') if street_number else None
      if street:
        components.append(street)

      # 按层级添加地址信息
      for key in ['township', 'district', 'city', 'province']:
        value = address_component.get(key)
        if value:
          components.append(value)

      # 添加行政区划代码和国家
      adcode = address_component.get('adcode')
      if adcode:
        components.append(adcode)

      country = address_component.get('country')
      if country:
        components.append(country)

      # 用逗号连接所有组件
      return ', '.join(components) if components else None
    else:
      print(f"高德地图API错误: {result.get('info', '未知错误')}")
      return None
  except Exception as e:
    print(f"高德地图API请求失败: {e}")
    return None


ACTIVITY_KEYS = [
  "run_id",
  "name",
  "distance",
  "moving_time",
  "type",
  "start_date",
  "start_date_local",
  "location_country",
  "summary_polyline",
  "average_heartrate",
  "average_speed",
  "elevation_gain",
  "source",
]


class Activity(Base):
  __tablename__ = "activities"

  run_id = Column(Integer, primary_key=True)
  name = Column(String)
  distance = Column(Float)
  moving_time = Column(Interval)
  elapsed_time = Column(Interval)
  type = Column(String)
  start_date = Column(String)
  start_date_local = Column(String)
  location_country = Column(String)
  summary_polyline = Column(String)
  average_heartrate = Column(Float)
  average_speed = Column(Float)
  elevation_gain = Column(Float)
  streak = None
  source = Column(String)

  def to_dict(self):
    out = {}
    for key in ACTIVITY_KEYS:
      attr = getattr(self, key)
      if isinstance(attr, (datetime.timedelta, datetime.datetime)):
        out[key] = str(attr)
      else:
        out[key] = attr

    if self.streak:
      out["streak"] = self.streak

    return out


def update_or_create_activity(session, run_activity):
  created = False
  try:
    activity = (
      session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
    )
    type = run_activity.type
    source = run_activity.source if hasattr(run_activity, "source") else "gpx"
    if run_activity.type in TYPE_DICT:
      type = TYPE_DICT[run_activity.type]

    current_elevation_gain = 0.0  # default value

    # https://github.com/stravalib/stravalib/blob/main/src/stravalib/strava_model.py#L639C1-L643C41
    if (
      hasattr(run_activity, "total_elevation_gain")
      and run_activity.total_elevation_gain is not None
    ):
      current_elevation_gain = float(run_activity.total_elevation_gain)
    elif (
      hasattr(run_activity, "elevation_gain")
      and run_activity.elevation_gain is not None
    ):
      current_elevation_gain = float(run_activity.elevation_gain)

    if not activity:
      start_point = run_activity.start_latlng
      location_country = getattr(run_activity, "location_country", "")
      # or China for #176 to fix
      if not location_country and start_point or location_country == "China":
        try:
          location_country = reverse_geocode_gaode(
            start_point.lat, start_point.lon
          )
          print(f"{run_activity.id}: 1正在使用高德地图解析: {start_point.lat}, {start_point.lon}, 结果是: {location_country}")
        # limit (only for the first time)
        except Exception:
          try:
            location_country = reverse_geocode_gaode(
              start_point.lat, start_point.lon
            )
            print(f"{run_activity.run_id}: 2正在使用高德地图解析: {start_point.lat}, {start_point.lon}, 结果是: {location_country}")
          except Exception as e:
            print(f"高德地图解析失败: {e}")
            pass

      activity = Activity(
        run_id=run_activity.id,
        name=run_activity.name,
        distance=run_activity.distance,
        moving_time=run_activity.moving_time,
        elapsed_time=run_activity.elapsed_time,
        type=type,
        start_date=run_activity.start_date,
        start_date_local=run_activity.start_date_local,
        location_country=location_country,
        average_heartrate=run_activity.average_heartrate,
        average_speed=float(run_activity.average_speed),
        elevation_gain=current_elevation_gain,
        summary_polyline=(
          run_activity.map and run_activity.map.summary_polyline or ""
        ),
        source=source,
      )
      session.add(activity)
      created = True
    else:
      activity.name = run_activity.name
      activity.distance = float(run_activity.distance)
      activity.moving_time = run_activity.moving_time
      activity.elapsed_time = run_activity.elapsed_time
      activity.type = type
      activity.average_heartrate = run_activity.average_heartrate
      activity.average_speed = float(run_activity.average_speed)
      activity.elevation_gain = current_elevation_gain
      activity.summary_polyline = (
        run_activity.map and run_activity.map.summary_polyline or ""
      )
      activity.source = source
  except Exception as e:
    print(f"something wrong with {run_activity.id}")
    print(str(e))

  return created


def add_missing_columns(engine, model):
  inspector = inspect(engine)
  table_name = model.__tablename__
  columns = {col["name"] for col in inspector.get_columns(table_name)}
  missing_columns = []

  for column in model.__table__.columns:
    if column.name not in columns:
      missing_columns.append(column)
  if missing_columns:
    with engine.connect() as conn:
      for column in missing_columns:
        column_type = str(column.type)
        conn.execute(
          text(
            f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
          )
        )


def init_db(db_path):
  engine = create_engine(
    f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
  )
  Base.metadata.create_all(engine)

  # check missing columns
  add_missing_columns(engine, Activity)

  sm = sessionmaker(bind=engine)
  session = sm()
  # apply the changes
  session.commit()
  return session
