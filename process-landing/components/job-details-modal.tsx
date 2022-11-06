import { Modal, Spin, Typography } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import synchronizer from '../../../../../services/synchronizer';
import { ClearIcon } from '../../../../CustomIcons/icons';
import LocaltimeViewer from '../../../../localtime-viewer';
import MasterTable from '../../../../master-table-v2';
import MasterTableV3 from '../../../../master-table-v3';
import { debounce } from 'lodash';

const JobsDetailsModal = ({
  visible,
  handleClose,
  data,
  isLoading,
  status,
  getJobsDetailsByStatusAPI,
}) => {
  const column = [
    {
      title: 'PROCESS NAME',
      dataIndex: 'processName',
      // sorter: true,
      // sortDirections: ['ascend', 'descend', 'ascend'],
      renderCell: (processName, record) => {
        return (
          <Link
            className="text-neutral-2 table-link"
            // to={`/control/v2/rpa/process/${record.processId}`}
            to={`/control/v3/rpa/process/${record.processId}${
              record?.tenantIdV3 ? `/overview/${record?.tenantIdV3}` : ''
            }`}>
            {processName}
          </Link>
        );
      },
    },
    {
      title: 'JOB ID',
      dataIndex: 'jobId',
      renderText: (jobId) => jobId || '-',
      renderCell: (jobId) => (
        <div style={{ wordBreak: 'break-all' }}>{jobId}</div>
      ),
      sorter: true,
      sortDirections: ['ascend', 'descend', 'ascend'],
      enableFilter: true,
      search: {
        placeholder: 'job id',
      },
    },
    {
      title: 'DATE',
      dataIndex: 'startedTimeInUtc',
      renderText: (startedTimeInUtc, record) =>
        LocaltimeViewer({ utc: startedTimeInUtc }),
      sorter: true,
      sortDirections: ['ascend', 'descend', 'ascend'],
    },
    {
      title: 'MESSAGE',
      dataIndex: 'jobInfo',
      renderText: (jobInfo) => jobInfo || '-',
      renderCell: (jobInfo, record) => (
        <Typography.Paragraph
          style={{ maxWidth: 400 }}
          ellipsis={{
            rows: 3,
            expandable: true,
            symbol: (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.info({
                      content: record.message
                        ? `ERROR: ${record.message}`
                        : jobInfo?.message || '-',
                      icon: null,
                      prefixCls: 'delphi-modal',
                    });
                  }}
                  className="table-link">
                  Read more
                </span>
              </div>
            ),
          }}>
          {record.message
            ? `ERROR: ${record.message}`
            : jobInfo?.message || '-'}
        </Typography.Paragraph>
      ),
      enableFilter: true,
      enableSort: true,
      search: {
        name: 'message',
        placeholder: 'message',
      },
    },
  ];

  const [tableData, setTableData] = React.useState({
    data: [],
    totalCount: 0,
  });
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (synchronizer.selectedSource === 'legacy-webhook') {
      setTableData({
        ...tableData,
        data: (data || []).map((d) => ({
          ...d,
          id: Math.round(Math.random() * 10000000000),
        })),
      });
    }
  }, [data]);
  React.useEffect(() => {
    return () =>
      setTableData({
        data: [],
        totalCount: 0,
      });
  }, []);

  React.useEffect(() => {
    if (synchronizer.selectedSource === 'synchronizer' && visible) {
      // refreshData({
      //   query: {
      //     page: 1,
      //     size: 10,
      //     where: {},
      //     search: [],
      //   }
      // });
    }
  }, [visible]);

  const refreshData = async (q) => {
    setLoading(true);
    const res = await getJobsDetailsByStatusAPI(status.toLowerCase(), q);
    setTableData({
      data: (res.data || []).map((d) => ({
        ...d,
        id: Math.round(Math.random() * 10000000000),
      })),
      totalCount: res.totalCount || 0,
    });
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      mask
      footer={false}
      title={`${status} job details`}
      onCancel={handleClose}
      width="1100px"
      closeIcon={<ClearIcon className="font-16" />}
      className="business-messages-modal"
      destroyOnClose>
      <Spin spinning={loading}>
        {synchronizer.selectedSource === 'legacy-webhook' ? (
          <MasterTable
            columns={column}
            data={tableData.data}
            primaryKeyColumn="id"
            persistanceKey="jobs-details-table-modal"
            refreshData={() => {}}
            showFilter={false}
            showShowHideButton={false}
          />
        ) : (
          <MasterTableV3
            columns={column}
            data={tableData.data}
            // title={`${status} job details`}
            primaryKeyColumn="id"
            persistanceKey="jobs-details-table-modal"
            refreshData={debounce((q) => {
              refreshData({
                query: {
                  ...q?.query,
                  sort: q?.query?.sort || {
                    startedTimeInUtc: -1,
                  },
                },
              });
            }, 100)}
            showFilter={false}
            searchEnabled={false}
            showShowHideButton={false}
            enableUrlState
            total={tableData.totalCount}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default JobsDetailsModal;
