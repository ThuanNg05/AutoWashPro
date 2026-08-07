using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsAddOnColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "isaddon",
                table: "services");

            migrationBuilder.UpdateData(
                table: "loyaltyconfig",
                keyColumn: "configid",
                keyValue: 1,
                column: "updatedat",
                value: new DateTime(2026, 8, 7, 3, 56, 31, 527, DateTimeKind.Utc).AddTicks(9716));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isaddon",
                table: "services",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "loyaltyconfig",
                keyColumn: "configid",
                keyValue: 1,
                column: "updatedat",
                value: new DateTime(2026, 8, 6, 4, 22, 47, 941, DateTimeKind.Utc).AddTicks(4724));

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 999,
                column: "isaddon",
                value: false);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1000,
                column: "isaddon",
                value: false);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1001,
                column: "isaddon",
                value: true);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1002,
                column: "isaddon",
                value: true);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1003,
                column: "isaddon",
                value: true);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1004,
                column: "isaddon",
                value: true);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1005,
                column: "isaddon",
                value: true);

            migrationBuilder.UpdateData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 1006,
                column: "isaddon",
                value: true);
        }
    }
}
