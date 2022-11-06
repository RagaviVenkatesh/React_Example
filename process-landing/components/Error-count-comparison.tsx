import { Card, DatePicker, Row, Col, Switch, Spin, Badge } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CalendarIcon } from '../../../../CustomIcons/icons';
import { getErrorCountData } from '../../utils/convert-api-data';
import * as _ from 'lodash';

export const HighestErrorCountGraph = ({ getErrorCount }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [ErrorData, setErrorData] = React.useState({});
  const [percentage, setPercentage] = React.useState(0);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [exceptionJobs, setExceptionJobs] = React.useState(0);
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedDateRange, setSelectedDateRange] = useState({
    fullForm: '',
    truncatedForm: '',
  });
  const { RangePicker } = DatePicker;

  const getGraphData = React.useCallback(
    async (fromDate?, toDate?, needLoading = true) => {
      setIsLoading(needLoading && true);
      const res = await getErrorCount(fromDate, toDate);
      setErrorData(res);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    const fromDate = moment().startOf('year');
    const toDate = moment();
    onRangeChange([fromDate, toDate]);
  }, []);

  const onRangeChange = (value: moment.Moment[]) => {
    let fromDate: string;
    let toDate: string;
    if (value === null) {
      const yearStartingDate = moment().startOf('year');
      fromDate = yearStartingDate.format('yyyy-MM-DD');
      toDate = moment().format('yyyy-MM-DD');
      setSelectedDateRange({
        truncatedForm: `${yearStartingDate.format(
          "MMM['] YY",
        )} - ${moment().format("MMM['] YY")}`,
        fullForm: `${yearStartingDate.format('MMM YYYY')} - ${moment().format(
          'MMM YYYY',
        )}`,
      });
    } else {
      fromDate = value[0].startOf('M').format('yyyy-MM-DD');
      toDate = value[1].endOf('M').format('yyyy-MM-DD');
      setSelectedDateRange({
        truncatedForm: `${value[0].format("MMM['] YY")} - ${value[1].format(
          "MMM['] YY",
        )}`,
        fullForm: `${value[0].format('MMM YYYY')} - ${value[1].format(
          'MMM YYYY',
        )}`,
      });
    }
    setFromDate(fromDate.toString());
    setToDate(toDate.toString());
    getGraphData(fromDate, toDate);
  };

  const defaultConfig = {
    fill: true,
    tension: 0,
    borderWidth: 2,
    pointRadius: 0,
  };

  const getData = React.useCallback(() => {
    const objData = getErrorCountData(ErrorData);
    setPercentage(objData?.percentage ? Math.ceil(objData?.percentage) : 0);
    setTotalJobs(objData?.totalJobs ? objData?.totalJobs : 0);
    setExceptionJobs(objData?.exceptionJobs ? objData?.exceptionJobs : 0);
    setEndDate(objData?.endDate ? objData?.endDate : '');
    console.log(endDate);
    let Label = objData?.labels ? objData?.labels : '';
    return {
      labels: Label,
      datasets: [
        {
          label: '',
          data: objData?.errorCount,
          borderColor: '#4C91C9',
          ...defaultConfig,
        },
      ],
    };
  }, [ErrorData]);

  const getChartOptions = {
    legend: {
      display: false,
    },
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          ticks: {
            beginAtZero: false,
          },
        },
      ],
    },
  };

  return (
    <Spin spinning={isLoading}>
      <Card className="bg-neutral-85 mt-5" title={'Error count comparison'}>
        <Row gutter={24}>
          <Col span={16}>
            <>
              <div style={{ height: 415 }}>
                {fromDate && toDate && (
                  <Line data={getData} options={getChartOptions} />
                )}
              </div>
              <Row className="mt-4" align="middle" justify="center" gutter={24}>
                <Col>
                  <Badge
                    color={'#4C91C9'}
                    text={
                      <span className="font-12">
                        {fromDate.slice(0, 10) +
                          '    -    ' +
                          toDate.slice(0, 10)}
                      </span>
                    }
                  />
                </Col>
              </Row>
            </>
          </Col>
          <Col
            span={8}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Row>
              <RangePicker
                onChange={onRangeChange}
                suffixIcon={<CalendarIcon className="font-16 text-neutral-5" />}
                picker="month"
                format="MMM YYYY"
                className="build-range-picker"
              />
            </Row>
            <Row>
              {' '}
              <div style={{ marginTop: '20px' }}> Total counts</div>
            </Row>
            <Row>
              {' '}
              <div style={{ fontSize: '25px' }}>{percentage + '%'}</div>
              <div style={{ marginLeft: '10px', marginTop: '13px' }}>
                {totalJobs + '  vs  ' + exceptionJobs}
              </div>
            </Row>
          </Col>
        </Row>
      </Card>
    </Spin>
  );
};

export default HighestErrorCountGraph;
