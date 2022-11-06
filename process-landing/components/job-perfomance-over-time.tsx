import { Card, Row, Radio, Select, Spin } from 'antd';
import React from 'react';
import { Bar } from 'react-chartjs-2';
import useSocket, {
  getControlRoom,
} from '../../../../../common/hooks/useSocket';
import {
  chartLegend,
  getChartOptions,
} from '../../../../../utils/chart-options';
import { CaretDownIcon, CheckIcon } from '../../../../CustomIcons/icons';
import { getJobPerformanceOverTimeData } from '../../utils/convert-api-data';
import JobsDetailsModal from './job-details-modal';
import moment from 'moment';
import synchronizer from '../../../../../services/synchronizer';
import Bridge from '../../../../../common/bridge/Bridge';
import { debounce } from 'lodash';
import BarGraph from '../../../../graphs/bar-graph';
import CustomTooltip from '../../../../custom-tooltip';

const { Option } = Select;

const daysRangeList = [
  {
    text: 'Last week',
    value: 'lastWeek',
    disabled: true,
  },
  {
    text: 'Last month',
    value: 'lastMonth',
    disabled: true,
  },
  {
    text: 'Last 3 months',
    value: 'last3Month',
    disabled: true,
  },
  {
    text: 'Last 6 months',
    value: 'last6Month',
    disabled: true,
  },
  {
    text: 'Last 12 months',
    value: 'last12Month',
    disabled: false,
  },
];
export const JobPerformanceOverTime = ({
  organisationId,
  getJobPerformanceAPI,
  getJobsDetailsByStatusAPI,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDateRange, setSelectedDateRange] =
    React.useState('last12Month');
  const [jobDetailsModal, setJobDetailsModal] = React.useState({
    visible: false,
    data: [],
    isLoading: false,
    status: '',
  });
  const synchronizerEvent = useSocket(getControlRoom(organisationId));

  const [chartData, setChartData] = React.useState([]);

  const [filter, setFilter] = React.useState([]);
  const filterRef = React.useRef([]);
  filterRef.current = filter;

  const { getEvent, removeEvent } = useSocket(`${organisationId}/RPAProcesses`);
  const getBarChartData = React.useCallback(() => {
    const modifiedData = getJobPerformanceOverTimeData(chartData);
    if (synchronizer.selectedSource === 'synchronizer') {
      return {
        labels:
          modifiedData?.labels?.length > 0
            ? modifiedData?.labels
            : [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ],
        datasets: [
          {
            backgroundColor: '#53B563',
            data: modifiedData.completedData,
            label: 'Completed',
          },
          {
            backgroundColor: '#CD4949',
            data: modifiedData.exceptionedData,
            label: 'Exceptioned',
          },
          {
            backgroundColor: '#4c91c9',
            data: modifiedData.runningData,
            label: 'Running',
          },
          {
            backgroundColor: '#D97635',
            data: modifiedData.stoppedData,
            label: 'Stopped',
          },
          {
            backgroundColor: '#6E7D91',
            data: modifiedData.suspendedData,
            label: 'Suspended',
          },
          {
            backgroundColor: '#DB9D2E',
            data: modifiedData.warningData,
            label: 'Warning',
          },
          {
            backgroundColor: '#9AC1E1',
            data: modifiedData.pendingData,
            label: 'Pending',
          },
        ],
      };
    }
    return {
      labels:
        modifiedData?.labels?.length > 0
          ? modifiedData?.labels
          : [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ],
      datasets: [
        {
          backgroundColor: '#53B563',
          data: modifiedData.completedData,
          label: 'Completed',
        },
        {
          backgroundColor: '#CD4949',
          data: modifiedData.exceptionedData,
          label: 'Exceptioned',
        },
      ],
    };
  }, [chartData]);
  const barChartOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onClick: async (event, elements) => {
        if (!elements[0]?._chart) {
          return;
        }
        const chart = elements[0]._chart;
        const element = chart.getElementAtEvent(event)[0];
        const val = getBarChartData().labels[element._index];
        const month = moment(val, "MMM['] YY");
        const status = getBarChartData().datasets[element._datasetIndex].label;
        setJobDetailsModal((oldValue) => ({
          ...oldValue,
          visible: true,
          isLoading: true,
          status,
        }));
        // const res = await getJobsDetailsByStatusAPI(
        //   status.toLowerCase(),
        //   month.clone().startOf('month').toDate().getTime(),
        //   month.clone().endOf('month').toDate().getTime(),
        //   filter,
        // );
        setDetailsDateRange({
          startTime: month.clone().startOf('month').toDate().getTime(),
          endTime: month.clone().endOf('month').toDate().getTime(),
        });
        setJobDetailsModal((oldValue) => ({
          ...oldValue,
          isLoading: false,
          // data: res || [],
        }));
      },
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
              callback: (value: number) =>
                Number.isInteger(value) ? value : null,
              crossAlign: 'center',
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 10,
              beginAtZero: true,
              stepSize: 25,
              // labelOffset: -25,
            },
            scaleLabel: {
              display: true,
              labelString: 'Number of jobs',
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 12,
            },
          },
        ],
        xAxes: [
          {
            gridLines: {
              color: '#424B57',
              tickMarkLength: 10,
            },
            barPercentage: 0.15,
            categoryPercentage: 2,
            stacked: true,
            ticks: {
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 10,
            },
            scaleLabel: {
              display: true,
              labelString: 'Time (Month)',
              padding: 8,
              fontColor: '#8B97A7',
              fontFamily: 'Avenir Next Demi',
              fontWeight: 600,
              fontSize: 12,
            },
          },
        ],
      },
    }),
    [chartData, getBarChartData],
  );
  const getData = React.useCallback(
    async (needLoading = true, functionId = []) => {
      setIsLoading(needLoading && true);
      const res = await getJobPerformanceAPI(functionId);
      setChartData(res);
      setIsLoading(false);
    },
    [setIsLoading, setChartData, getJobPerformanceAPI],
  );

  React.useEffect(() => {
    const filterLs = localStorage.getItem('processFilter');
    const filterLsArray = filterLs ? filterLs.split(',').filter((f) => f) : [];
    setFilter(filterLsArray);
    getData(true, filterLsArray);
    if (synchronizer.selectedSource === 'legacy-webhook') {
      getEvent('rpa_process_completed', () => {
        getData(false, filterRef.current);
      });
      getEvent('rpa_process_exceptioned', () => {
        getData(false, filterRef.current);
      });
    }

    const subscribe = Bridge.addEventListener(
      'process/filterChanged',
      (value) => {
        setFilter(value);
        getData(true, value);
      },
    );

    if (synchronizer.selectedSource === 'synchronizer') {
      synchronizerEvent.getEvent(
        'JOBS/UPDATED',
        debounce(() => {
          getData(false, filterRef.current);
        }, 300),
      );
    }

    return () => {
      if (synchronizer.selectedSource === 'legacy-webhook') {
        removeEvent('rpa_process_completed');
        removeEvent('rpa_process_exceptioned');
      }
      if (synchronizer.selectedSource === 'synchronizer') {
        synchronizerEvent.removeEvent('JOBS/UPDATED');
      }
      subscribe();
    };
  }, []);

  const [detailsDateRange, setDetailsDateRange] = React.useState({
    startTime: null,
    endTime: null,
  });

  const modalAPI = React.useCallback(
    async (status, query) => {
      return await getJobsDetailsByStatusAPI(
        status.toLowerCase(),
        detailsDateRange.startTime,
        detailsDateRange.endTime,
        filter,
        query,
      );
    },
    [detailsDateRange, filter],
  );

  return (
    <Spin spinning={isLoading}>
      <Card
        title={
          <Row justify="space-between" style={{ height: 41 }} align="middle">
            <span>
              Job performance over time {'  '}
              <CustomTooltip
                content="Jobs are sessions/executions of a process, how many times all process have run since connecting to Turbotic. 
              This graph displays the status on all executions, filter the chart by clicking on the statuses"
              />
            </span>
            {/* <Select
              bordered={false}
              suffixIcon={<CaretDownIcon />}
              value={selectedDateRange}
              onChange={(value) => setSelectedDateRange(value)}
              dropdownMatchSelectWidth={163}
              className="ml-2 text-neutral-2"
              dropdownClassName="bg-neutral-85 font-14"
              optionLabelProp="label">
              {daysRangeList.map((days) => (
                <Option
                  disabled={days.disabled}
                  value={days.value}
                  label={days.text}>
                  <Row align="middle" justify="space-between">
                    {days.text}
                    {days.value === selectedDateRange && (
                      <CheckIcon style={{ fontSize: 16, color: '#4C91C9' }} />
                    )}
                  </Row>
                </Option>
              ))}
            </Select> */}
          </Row>
        }
        className="bg-neutral-85 job-performance-over-time">
        <div style={{ height: '452px' }}>
          {synchronizer.selectedSource === 'legacy-webhook' ? (
            <Bar
              options={getChartOptions({
                yAxesTickCallback: (value) =>
                  Number.isInteger(value) ? value : null,
                xBarPercentage: 0.6,
                legend: chartLegend,
                onClick: async (event, elements) => {
                  if (!elements[0]?._chart) {
                    return;
                  }
                  const chart = elements[0]._chart;
                  const element = chart.getElementAtEvent(event)[0];
                  const val = getBarChartData().labels[element._index];
                  const month = moment(val, "MMM['] YY");
                  const status =
                    getBarChartData().datasets[element._datasetIndex].label;
                  setJobDetailsModal((oldValue) => ({
                    ...oldValue,
                    visible: true,
                    isLoading: true,
                    status,
                  }));

                  const res = await getJobsDetailsByStatusAPI(
                    status.toLowerCase(),
                    month.clone().startOf('month').toDate().getTime(),
                    month.clone().endOf('month').toDate().getTime(),
                    filter,
                  );

                  setJobDetailsModal((oldValue) => ({
                    ...oldValue,
                    isLoading: false,
                    data: res || [],
                  }));
                },
              })}
              data={getBarChartData()}
            />
          ) : (
            <BarGraph options={barChartOptions} data={getBarChartData()} />
          )}
        </div>
        <JobsDetailsModal
          data={jobDetailsModal.data}
          visible={jobDetailsModal.visible}
          handleClose={() => {
            setJobDetailsModal({
              visible: false,
              data: [],
              isLoading: false,
              status: '',
            });
          }}
          status={jobDetailsModal.status}
          isLoading={jobDetailsModal.isLoading}
          getJobsDetailsByStatusAPI={modalAPI}
        />
      </Card>
    </Spin>
  );
};

export interface ChartProps {
  completed_item: { doc_count: number };
  doc_count: number;
  exception_item: { doc_count: number };
  key: number;
}
