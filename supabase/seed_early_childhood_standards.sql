begin;

-- มาตรฐานการประกันคุณภาพภายนอก: การศึกษาปฐมวัย
insert into public.standards (code, name)
select data.code, data.name
from (
  values
    ('1', 'มาตรฐานที่ 1 ผลลัพธ์คุณภาพของเด็กปฐมวัย'),
    ('2', 'มาตรฐานที่ 2 การบริหารจัดการสถานพัฒนาเด็กปฐมวัย'),
    ('3', 'มาตรฐานที่ 3 การพัฒนาคุณภาพการจัดประสบการณ์การเรียนรู้เด็กปฐมวัย')
) as data(code, name)
where not exists (
  select 1
  from public.standards existing
  where existing.code = data.code
);

-- ตัวชี้วัดมาตรฐานที่ 1
insert into public.indicators (standard_id, code, name)
select standard_row.id, data.code, data.name
from (
  values
    ('1.1', 'เด็กเจริญเติบโตสมวัยสุขภาพแข็งแรงและมีพัฒนาการด้านการเคลื่อนไหว'),
    ('1.2', 'เด็กมีพัฒนาการด้านสติปัญญาเรียนรู้และสร้างสรรค์'),
    ('1.3', 'เด็กมีพัฒนาการด้านภาษาและการสื่อสาร'),
    ('1.4', 'เด็กมีพัฒนาการด้านอารมณ์และจิตใจ'),
    ('1.5', 'เด็กมีพัฒนาการด้านสังคมและคุณธรรม')
) as data(code, name)
cross join lateral (
  select id
  from public.standards
  where code = '1'
  order by id
  limit 1
) standard_row
where not exists (
  select 1
  from public.indicators existing
  where existing.standard_id = standard_row.id
    and existing.code = data.code
);

-- ตัวชี้วัดมาตรฐานที่ 2
insert into public.indicators (standard_id, code, name)
select standard_row.id, data.code, data.name
from (
  values
    ('2.1', 'วิสัยทัศน์ พันธกิจ และค่านิยมของสถานศึกษา'),
    ('2.2', 'กลยุทธ์และเป้าหมายของสถานศึกษา'),
    ('2.3', 'ผู้บริหารสถานศึกษามีภาวะผู้นำทางวิชาการและบริหารจัดการด้วยหลักธรรมาภิบาล'),
    ('2.4', 'การพัฒนาวิชาชีพผู้บริหาร ครูและบุคลากรทางการศึกษา'),
    ('2.5', 'การนิเทศครูและการประเมินการปฏิบัติงานอย่างเป็นระบบ'),
    ('2.6', 'การใช้สื่อสนับสนุนการจัดประสบการณ์การเรียนรู้อย่างเพียงพอและปลอดภัย'),
    ('2.7', 'การจัดสภาพแวดล้อม แหล่งเรียนรู้ที่มีความมั่นคงและปลอดภัย'),
    ('2.8', 'สวัสดิการ สวัสดิภาพ แนวทางการป้องกันโรค อุบัติภัย ภัยพิบัติ'),
    ('2.9', 'กระบวนการเฝ้าระวัง การคัดกรองเบื้องต้นสำหรับเด็กที่ต้องการความช่วยเหลือ'),
    ('2.10', 'การสร้างเครือข่ายและการมีส่วนร่วมของผู้ปกครอง ชุมชน และหน่วยงานภายนอก')
) as data(code, name)
cross join lateral (
  select id
  from public.standards
  where code = '2'
  order by id
  limit 1
) standard_row
where not exists (
  select 1
  from public.indicators existing
  where existing.standard_id = standard_row.id
    and existing.code = data.code
);

-- ตัวชี้วัดมาตรฐานที่ 3
insert into public.indicators (standard_id, code, name)
select standard_row.id, data.code, data.name
from (
  values
    ('3.1', 'หลักสูตรและแผนการจัดประสบการณ์การเรียนรู้'),
    ('3.2', 'การจัดกิจกรรมพัฒนาคุณลักษณะพึงประสงค์ที่เหมาะสมกับวัย'),
    ('3.3', 'ครูประเมินพัฒนาการของเด็กอย่างเป็นระบบและต่อเนื่อง')
) as data(code, name)
cross join lateral (
  select id
  from public.standards
  where code = '3'
  order by id
  limit 1
) standard_row
where not exists (
  select 1
  from public.indicators existing
  where existing.standard_id = standard_row.id
    and existing.code = data.code
);

commit;

-- ตรวจสอบข้อมูลหลังรัน
select
  standards.code as standard_code,
  standards.name as standard_name,
  indicators.code as indicator_code,
  indicators.name as indicator_name
from public.standards
left join public.indicators
  on indicators.standard_id = standards.id
order by
  standards.code::integer,
  split_part(indicators.code, '.', 1)::integer,
  split_part(indicators.code, '.', 2)::integer;
