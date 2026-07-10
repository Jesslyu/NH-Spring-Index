// ======================================================
// 北半球春季长度识别（CMIP6 - NEX-GDDP-CMIP6）
// 模式：ACCESS-CM2
// 情景：SSP245
// 指标：SOS / EOS / SL
// 方法：连续5个5天滑动平均气温达到阈值
// ======================================================


// ======================================================
// 1. 参数设置
// ======================================================

// 北半球中高纬区域
var region = ee.Geometry.BBox(-180, 23.5, 180, 90);

// 年份
var startYear = 1961;
var endYear = 2014;

// 模式
var model = 'ACCESS-CM2';

// 情景
var scenario = 'historical';

// 可修改为：
// 'historical'
// 'ssp126'没有
// 'ssp245'
// 'ssp585'


// ======================================================
// 2. 春季识别函数
// ======================================================

var getPhenologyStrict = function(year) {

  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);

  // --------------------------------------------------
  // A. 读取 CMIP6 日平均气温 tas
  // --------------------------------------------------

  var dailyColl = ee.ImageCollection('NASA/GDDP-CMIP6')
    .filterDate(startDate, endDate)
    .filter(ee.Filter.eq('model', model))
    .filter(ee.Filter.eq('scenario', scenario))
    .select('tas')
    .map(function(img) {

      // Kelvin -> Celsius
      var tas = img.subtract(273.15)
        .rename('tas');

      return tas.set(
        'system:time_start',
        img.get('system:time_start')
      );
    });

  // --------------------------------------------------
  // B. 检查数据数量
  // --------------------------------------------------

  print('Year:', year);
  print('Daily images:', dailyColl.size());

  // --------------------------------------------------
  // C. 转为Bands
  // --------------------------------------------------

  var dailyBands = dailyColl.toBands();

  // --------------------------------------------------
  // D. 计算5天滑动平均
  // --------------------------------------------------

  var houTempList = ee.List.sequence(
    0,
    dailyColl.size().subtract(5)
  ).map(function(i) {

    i = ee.Number(i);

    var meanImg = dailyBands
      .select(ee.List.sequence(i, i.add(4)))
      .reduce(ee.Reducer.mean());

    return meanImg
      .rename('houTemp')
      .set('idx', i);
  });

  var houTempColl =
    ee.ImageCollection.fromImages(houTempList);

  // --------------------------------------------------
  // E. 连续5个候温达标判断函数
  // --------------------------------------------------

  var findSeasonOnset = function(tempColl, threshold) {

    // 二值化
    var binary = tempColl.map(function(img) {

      return img.gte(threshold)
        .int()
        .rename('binary')
        .set('idx', img.get('idx'));
    });

    var binaryBands = binary.toBands();

    var size = binary.size();

    // 连续5个候温均达标
    var verified = ee.List.sequence(
      0,
      size.subtract(5)
    ).map(function(i) {

      i = ee.Number(i);

      var isStable = binaryBands
        .select(ee.List.sequence(i, i.add(4)))
        .reduce(ee.Reducer.min());

      // DOY
      var doy = i.add(1);

      return ee.Image.constant(doy)
        .updateMask(isStable)
        .float();
    });

    // 返回首次满足条件日期
    return ee.ImageCollection
      .fromImages(verified)
      .reduce(ee.Reducer.min());
  };

  // --------------------------------------------------
  // F. SOS
  // 连续5个候温 >= 10℃
  // --------------------------------------------------

  var springOnset = findSeasonOnset(
    houTempColl,
    10
  ).rename('SOS');

  // --------------------------------------------------
  // G. EOS
  // 连续5个候温 >= 22℃
  // --------------------------------------------------

  var springWithdrawal = findSeasonOnset(
    houTempColl,
    22
  ).rename('EOS');

  // --------------------------------------------------
  // H. 春季长度
  // --------------------------------------------------

  var springLength = springWithdrawal
    .subtract(springOnset)
    .rename('SL');

  // --------------------------------------------------
  // I. 输出
  // --------------------------------------------------

  return ee.Image([
      springOnset,
      springWithdrawal,
      springLength
    ])
    .clip(region)
    .set('year', year);
};




// ======================================================
// 4. 批量导出
// ======================================================

for (var y = startYear; y <= endYear; y++) {

  Export.image.toDrive({

    image: getPhenologyStrict(y),

    description:
      model + '_' +
      scenario + '_Spring_' + y,

    folder: 'CMIP6_Spring',

    region: region,

    scale: 27830,

    crs: 'EPSG:4326',

    maxPixels: 1e13
  });
}