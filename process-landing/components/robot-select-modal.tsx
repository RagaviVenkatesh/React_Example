import { Button, Form, Modal, Select, Space, Spin } from 'antd';
import React from 'react';
import { customAxios } from '../../../../../hooks/axios';
import synchronizer from '../../../../../services/synchronizer';
import { CaretDownIcon, ClearIcon } from '../../../../CustomIcons/icons';
import _ from 'lodash';
import { errorMessage, successMessage } from '../../../../../utils/alert';

const { Option } = Select;

const RobotSelectModal = ({
  visible,
  handleCancel,
  onSuccess,
  processKey,
  organizationUnitId,
  tenantId,
  vendor,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [robotList, setRobotList] = React.useState([]);
  const [resourceList, setResourceList] = React.useState<any>([]);
  const [selectedRobot, setSelectedRobot] = React.useState<any>();
  const [selectedResource, setSelectedResource] = React.useState<any>();
  const [form] = Form.useForm();
  const [filteredRobotList, setFilteredRobotList] = React.useState([]);
  const [filteredResourceList, setFilteredResourceList] = React.useState([]);
  const getList = async () => {
    setIsLoading(true);
    const res = await synchronizer.control.rpa.robots.getRobotList({
      query: {
        where: {},
        size: 1000,
      },
      type: 'Production',
    });
    const resourceRes =
      await synchronizer.control.rpa.resources.getResourcesList(
        {
          query: {
            where: {},
            size: 1000,
          },
        },
        'Production',
      );
    const uniqueResource = _.uniqBy(resourceRes, function (e) {
      return e.name;
    });
    setResourceList(uniqueResource);
    setRobotList(res);
    setIsLoading(false);
  };

  const getTenantName = async (tenantId) => {
    var tenantId = tenantId;
    tenantId = tenantId.substring(tenantId.indexOf('-') + 1);
    const res = await customAxios(
      {
        url: `control/friendlyLabels/tenant/${tenantId}`,
      },
      false,
      {},
      'v3',
    );
    if (res?.response?.data?.name) {
      return res?.response?.data?.name;
    } else {
      return tenantId;
    }
  };

  const runProcess = async () => {
    const machineId = selectedResource?.meta?.MachineId;
    setIsLoading(true);
    const tenantName = await getTenantName(tenantId);

    const res = await customAxios(
      {
        url: `/control/rpa/details/${tenantName}/runrpabot`,
        method: 'put',
      },
      false,
      {
        releaseKey: processKey,
        organizationUnitId: Number(organizationUnitId),
        robotIds: selectedRobot?.botId ? [Number(selectedRobot?.botId)] : [],
        machineSessionIds: machineId ? [machineId] : [],
      },
    );
    if (res?.response?.data) {
      successMessage({ content: 'Job started successfully' });
      onClickClose();
      onSuccess();
    } else {
      const message = res?.error?.message;
      errorMessage({ content: message || 'Error running the process' });
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    setFilteredRobotList(
      (robotList || []).filter(
        (r) => r.tenantId === tenantId && r.vendor.includes('uipath'),
      ),
    );
  }, [robotList, tenantId]);

  React.useEffect(() => {
    setFilteredResourceList(
      (resourceList || []).filter(
        (r) => r.tenantId === tenantId && r.resourceVendor?.includes('uipath'),
      ),
    );
  }, [resourceList, tenantId]);

  React.useEffect(() => {
    getList();
  }, []);

  const onClickClose = () => {
    form.resetFields();
    handleCancel();
    setSelectedRobot(undefined);
    setSelectedResource(undefined);
  };

  return (
    <Modal
      title="Run job"
      closeIcon={<ClearIcon className="font-16" />}
      visible={visible}
      width="600px"
      footer={null}
      maskClosable
      onCancel={onClickClose}
      destroyOnClose>
      <Spin spinning={isLoading}>
        <Form requiredMark="optional" form={form} layout="vertical">
          <Form.Item label="Robot">
            <Select
              placeholder="Any robot"
              suffixIcon={<CaretDownIcon className="font-16" />}
              onChange={(value: number) =>
                setSelectedRobot(filteredRobotList[value])
              }
              allowClear>
              {filteredRobotList.map((robot, index) => (
                <Option value={index}>{robot.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Resource">
            <Select
              placeholder="Any resource"
              suffixIcon={<CaretDownIcon className="font-16" />}
              onChange={(value: number) =>
                setSelectedResource(filteredResourceList[value])
              }
              allowClear>
              {filteredResourceList.map((resource, index) => (
                <Option value={index}>{resource.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Space size={8}>
            <Button onClick={runProcess} type="primary">
              Run
            </Button>
            <Button onClick={onClickClose} type="text">
              Cancel
            </Button>
          </Space>
        </Form>
      </Spin>
    </Modal>
  );
};

export default RobotSelectModal;
