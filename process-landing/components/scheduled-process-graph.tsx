import { Badge, Button, Card, Col, DatePicker, Row, Space, Spin } from 'antd';
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  CaretDownIcon,
  NextIcon,
  PrevIcon,
} from '../../../../CustomIcons/icons';
import * as _ from 'lodash';
import moment from 'moment';
const yLablels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const legendColor = [
  '#E9F1F8',
  '#C2D9EC',
  '#9AC1E1',
  '#73A9D5',
  '#4C91C9',
  '#3477AE',
  '#285C87',
  '#1C4160',
];

function getRandomColor() {
  const randomNumber = Math.floor(Math.random() * 7);
  return legendColor[randomNumber];
}
const datasetDefaultData = {
  data: new Array(24).fill(1),
  backgroundColor: new Array(24).fill(1).map(() => getRandomColor()),
  borderColor: '#3f4753',
  borderWidth: 0.5,
};

function getTotal(v) {
  return v?.runCount;
}

const getColorByRange = (range: number[], value: number) => {
  if (value === 0) {
    return undefined;
  }
  const index = range.findIndex(
    (r, i) => (range[i - 1] || 0) <= value && r >= value,
  );
  return legendColor[index];
};

const currentWeek = moment().get('week') - 1;
const currentYear = moment();

/**
 * Now it is renamed as Job history
 *
 */
const ScheduledProcessGraph = ({
  getScheduledProcessAPI,
}: {
  getScheduledProcessAPI: (
    startDate: string,
    numberOfDays: number,
  ) => Promise<any>;
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const [data, setData] = React.useState({});
  const [selectedYear, setSelectedYear] = React.useState(moment());

  const yearLastWeek = moment().endOf('year').get('isoWeek');
  const getScheduledProcess = React.useCallback(
    async (startDate: string, numberOfDays: number) => {
      setIsLoading(true);
      const res = await getScheduledProcessAPI(startDate, numberOfDays);
      if (res) {
        setData(res);
      } else {
        setData([]);
      }
      setIsLoading(false);
    },
    [],
  );

  const [selectedWeek, setSelectedWeek] = React.useState(currentWeek);

  const chartData = React.useCallback(() => {
    const finalData = yLablels.map((day) => {
      const dayLabel = Object.keys(data || {}).find((s) => s.includes(day));
      const d = data[dayLabel];
      if (d && d.runCount !== 0) {
        return {
          day: dayLabel,
          value: d,
        };
      }
      return {
        day,
        value: [],
      };
    });
    const maxValue = _.maxBy(
      _.maxBy(finalData, (data) => _.maxBy(data.value, 'runCount')?.runCount)
        ?.value,
      getTotal,
    );
    const end = maxValue?.runCount || 0;
    const start = 0;
    const n = 8;
    const totalLength = end - start;
    const subrangeLength = totalLength / n;
    let currentStart = start;
    const range = [];

    for (let i = 0; i < n; ++i) {
      if (i === 0) {
        range.push(Math.ceil(currentStart));
      } else {
        range.push(Math.ceil(currentStart + subrangeLength));
      }
      currentStart += subrangeLength;
    }
    const datasets = finalData.map((data) => ({
      ...datasetDefaultData,
      label: data.day,
      backgroundColor: data.value.map((vv) =>
        getColorByRange(range, vv?.runCount),
      ),
      extraLabel: data.value,
    }));

    return {
      labels: Array(24)
        .fill(1)
        .map((v, i) => `${i + 1}:00`),
      datasets: datasets,
    };
  }, [data]);

  const barChartOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      barValueSpacing: 1,
      legend: {
        display: false,
      },
      scales: {
        yAxes: [
          {
            gridLines: {
              tickMarkLength: 10,
              color: '#424B57',
            },
            stacked: true,
            ticks: {
              /**
               * Renders value of bar chart
               *
               * @param {object} value - contains value
               * @returns {Component } bar chart value
               */
              callback: (value: number) =>
                `${chartData()?.datasets[value]?.label || ''}`,
              crossAlign: 'center',
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 10,
              beginAtZero: true,
              stepSize: 1,
              labelOffset: -25,
            },
          },
        ],
        xAxes: [
          {
            gridLines: {
              color: '#424B57',
              tickMarkLength: 10,
            },
            barPercentage: 0.5,
            categoryPercentage: 2,
            stacked: true,
            ticks: {
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 10,
            },
          },
        ],
      },
      tooltips: {
        xAlign: 'center',
        callbacks: {
          label: (current, data) => {
            const extraLabel =
              data.datasets[current.datasetIndex].extraLabel[current.index];
            const label = data.datasets[current.datasetIndex].label;
            return extraLabel?.processes?.map(
              (lab) => `${lab.processName}: ${lab.runCount}`,
            );
          },
        },
      },
    }),
    [chartData],
  );
  React.useEffect(() => {
    const selectedWeekDate = selectedYear.set('w', selectedWeek + 1);
    const selectedWeekFirstDate = selectedWeekDate.clone().startOf('isoWeek');
    getScheduledProcess(selectedWeekFirstDate.format('YYYY-MM-DD'), 7);
  }, [selectedWeek]);

  // React.useEffect(() => {
  //   setSelectedWeek();
  //   const selectedWeekDate = selectedYear.set('w', selectedWeek + 1);
  //   const selectedWeekFirstDate = selectedWeekDate.clone().startOf('isoWeek');
  //   getScheduledProcess(selectedWeekFirstDate.format('YYYY-MM-DD'), 7);
  // }, [selectedYear]);
  return (
    <Spin spinning={isLoading}>
      <Card
        title={
          <Row justify="space-between" align="middle">
            Job history
            <Space size={8}>
              {/* <DatePicker
                style={{ width: 90 }}
                bordered={false}
                picker="year"
                suffixIcon={<CaretDownIcon className="font-16" />}
                allowClear={false}
                defaultValue={currentYear}
                onChange={(s) => setSelectedYear(s)}
              /> */}
              <Button
                disabled={selectedWeek === 1}
                onClick={() => setSelectedWeek((oldData) => oldData - 1)}
                type="text">
                <Row align="middle">
                  <PrevIcon className="mr-2" />
                  Prev
                </Row>
              </Button>
              <span className="font-14 text-neutral-4">
                Week {selectedWeek}
              </span>
              <Button
                disabled={selectedWeek === yearLastWeek}
                onClick={() => setSelectedWeek((oldData) => oldData + 1)}
                type="text">
                <Row align="middle">
                  Next <NextIcon className="ml-2" />
                </Row>
              </Button>
            </Space>
          </Row>
        }
        className="bg-neutral-85 mt-5 scheduled-process-graph">
        <div>
          <Row style={{ marginLeft: 44, marginTop: 2 }}>
            {Array(24)
              .fill(1)
              .map((_, index) => (
                <Col className="ticks" span={1}>
                  <div></div>
                  {`${index + 1 > 9 ? index + 1 : `0${index + 1}`}:00`}
                </Col>
              ))}
          </Row>
          <div style={{ height: '392px' }}>
            <Bar data={chartData()} options={barChartOptions} />
          </div>
        </div>
        <Row justify="center">
          <div className="mr-2">Low utilization</div>
          {legendColor.map((color) => (
            <Badge dot color={color} />
          ))}
          High utilization
        </Row>
      </Card>
    </Spin>
  );
};

export default React.memo(ScheduledProcessGraph);
